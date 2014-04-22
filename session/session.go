package session

import (
	"bufio"
	"compress/gzip"
	"compress/zlib"
	"crypto/rand"
	"crypto/tls"
	"encoding/base32"
	"errors"
	"io"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"
)

const (
	EOR      = 239
	SE       = 240
	NOP      = 241
	DataMark = 242
	BRK      = 243
	IP       = 244
	AO       = 245
	AYT      = 246
	EC       = 247
	EL       = 248
	GA       = 249
	SB       = 250
	WILL     = 251
	WONT     = 252
	DO       = 253
	DONT     = 254
	IAC      = 255

	OPT_TIMING_MARK = 6
	OPT_TERM_TYPE   = 24
	OPT_EOR         = 25
	OPT_NAWS        = 31
	OPT_LINEMODE    = 34
	OPT_ENVIRON     = 36
	OPT_NEW_ENVIRON = 39
	OPT_CHARSET     = 42
	OPT_MSSP        = 70
	OPT_MCCP        = 86
	OPT_MXP         = 91
	OPT_ATCP        = 200

	IS   = 0
	SEND = 1
	INFO = 2

	VAR     = 0
	VALUE   = 1
	ESC     = 2
	USERVAR = 3

	MSSP_VAR = 1
	MSSP_VAL = 2

	MODE     = 1
	EDIT     = 1
	TRAPSIG  = 2
	MODE_ACK = 4
)

var (
	ErrClosed         = errors.New("channel closed.")
	ErrInvalidCommand = errors.New("invalid command.")
)

var idEncoding = base32.NewEncoding("123456789abcdefghijklmnopqrstuvw")

var OptionNames = map[byte]string{
	SE:       "SE",
	NOP:      "NOP",
	DataMark: "DataMark",
	BRK:      "BRK",
	IP:       "IP",
	AO:       "AO",
	AYT:      "AYT",
	EC:       "EC",
	EL:       "EL",
	GA:       "GA",
	SB:       "SB",
	WILL:     "WILL",
	WONT:     "WONT",
	DO:       "DO",
	DONT:     "DONT",
	IAC:      "IAC",
}

var telnetdebug = log.New(os.Stdout, "", 0)
var MaxSessionConnections = 2

var Debugtelnet = false
var Compression = false

const PingInterval = 5 * time.Second

var (
	termtypes = [][]byte{[]byte("TOUCHE")}
	//termtypes = [][]byte{[]byte("VT100"), []byte("ANSI"), []byte("MTTS 141") /* 1+4+8+128 */}
)

type setWindowSizeCommand struct{ width, height byte }
type atcpCommand string

type message struct {
	event string
	data  string
}

type Session struct {
	conn       net.Conn
	id         string
	writer     *multiWriter
	readch     <-chan byte
	commands   chan<- interface{}
	errch      chan<- error
	buf        []byte
	sbbuf      []byte
	reader     *bufio.Reader
	termtypeix int
	debugbuf   []byte
	lastWrite  time.Time
}

func (sess *Session) FlushTelnetBuffer() {
	if !Debugtelnet {
		return
	}
	if len(sess.debugbuf) > 0 {
		telnetdebug.Println(string(sess.debugbuf))
		sess.debugbuf = sess.debugbuf[0:0]
	}
}

var errorlog = log.New(os.Stderr, "ERROR ", log.LstdFlags)

func (sess *Session) Id() string {
	return sess.id
}

func generateId() string {
	b := make([]byte, 16)
	rand.Read(b)
	return strings.TrimRight(idEncoding.EncodeToString(b), "=")
}

func openWriter(w http.ResponseWriter, r *http.Request) (net.Conn, writerFlusher, error) {
	hijacker := w.(http.Hijacker)
	sseConn, sseWriter, err := hijacker.Hijack()
	if err != nil {
		return nil, nil, err
	}

	sseWriter.WriteString("HTTP/1.1 200 OK\r\n")

	acceptEncoding := r.Header.Get("Accept-Encoding")
	encodings := strings.Split(acceptEncoding, ",")
	doCompress := false
	if Compression {
		for _, enc := range encodings {
			if strings.Trim(enc, " ") == "gzip" {
				doCompress = true
			}
		}
	}

	var writer writerFlusher
	if doCompress {
		sseWriter.WriteString("Content-Encoding: gzip\r\n")
		gzipWriter := gzip.NewWriter(sseWriter.Writer)
		writer = newWriteThroughFlusher(gzipWriter, sseWriter.Writer)
	} else {
		writer = sseWriter.Writer
	}

	sseWriter.WriteString("Content-Type: text/event-stream\r\n\r\n")
	sseWriter.Flush()

	return sseConn, writer, nil
}

func NewSession(sid string, w http.ResponseWriter, r *http.Request, onClose func()) (*Session, error) {
	log.Println("starting session.")

	if sid == "" {
		sid = generateId()
	}

	sseConn, writer, err := openWriter(w, r)
	if err != nil {
		return nil, err
	}
	mw := NewMultiWriter(sseConn, writer)

	config := tls.Config{
		InsecureSkipVerify: true,
	}

	conn, err := tls.Dial("tcp4", "avalon.mud.de:7778", &config)
	if err != nil {
		errorlog.Println("cannot open connection to avalon:", err)
		sseConn.Close()
		return nil, err
	}

	errch := make(chan error, 20)
	commandch := make(chan interface{})
	sess := &Session{
		conn:     conn,
		writer:   mw,
		errch:    errch,
		buf:      make([]byte, 0, 1024),
		sbbuf:    make([]byte, 0, 64),
		reader:   bufio.NewReader(conn),
		debugbuf: make([]byte, 0, 256),
		id:       sid,
		commands: commandch,
	}

	go func() {
		var err error

		defer conn.Close()
		defer mw.Close()
		defer close(commandch)

		quitch := make(chan bool)
		defer close(quitch)

		sess.initReadChannel(quitch)
		sess.writeSocketRaw("sessionid", []byte(sess.id))

	ReadLoop:
		for {
			var timeout <-chan time.Time
			if len(sess.buf) > 0 {
				timeout = time.After(100 * time.Millisecond)
			} else {
				timeout = time.After(6 * time.Second)
			}

			select {
			case b, ok := <-sess.readch:
				if !ok {
					break ReadLoop
				}
				err = sess.handleRead(b)
				break

			case <-timeout:
				err = sess.writeSocket()
				break

			case cmd := <-commandch:
				err = sess.writeSocket()
				if err != nil {
					break
				}
				err = sess.handleCommand(cmd)
				break

			case err = <-errch:
				break
			}

			if err != nil {
				break
			}
		}

		if err != nil {
			errorlog.Println(err)
		} else {
			err = sess.writeSocket()
			if err != nil {
				errorlog.Println(err)
			}
		}

		log.Println("Session end.")
		if onClose != nil {
			onClose()
		}
	}()

	return sess, nil
}

func (sess *Session) Attach(w http.ResponseWriter, r *http.Request) error {
	sseConn, writer, err := openWriter(w, r)
	if err != nil {
		return err
	}
	err = sess.writer.attach(sseConn, writer)
	if err != nil {
		sseConn.Close()
	} else {
		log.Println("attached session.")
	}

	return err
}

func (sess *Session) handleCommand(cmd interface{}) error {
	switch cmd := cmd.(type) {
	case string:
		data := []byte(cmd)
		data = append(data, '\n')
		_, err := sess.conn.Write(data)
		return err

	case setWindowSizeCommand:
		return sess.writeOption(IAC, SB, OPT_NAWS, 0, cmd.width, 0, cmd.height, IAC, SE)

	case atcpCommand:
		return sess.writeSb(OPT_ATCP, []byte(cmd))

	default:
		panic(ErrInvalidCommand)
	}
}

func (sess *Session) SendCommand(command string) {
	sess.commands <- command
}

func (sess *Session) SendNaws(width, height byte) {
	sess.commands <- setWindowSizeCommand{width, height}
}

func (sess *Session) SendAtcp(text string) {
	sess.commands <- atcpCommand(text)
}

func (sess *Session) writeSocket() error {
	err := sess.writeSocketRaw("text", sess.buf)
	if err != nil {
		sess.errch <- err
		return err
	}
	sess.buf = sess.buf[0:0]
	return nil
}

func (sess *Session) testPing() error {
	now := time.Now()
	if now.After(sess.lastWrite.Add(PingInterval)) {
		_, err := sess.writer.Write([]byte(":ping\r\n"))
		if err != nil {
			return err
		}
		err = sess.writer.Flush()
		if err != nil {
			return err
		}
		sess.lastWrite = now
	}
	return nil
}

func (sess *Session) writeSocketRaw(event string, data []byte) error {
	if len(data) == 0 {
		return sess.testPing()
	}
	sess.lastWrite = time.Now()

	writer := sess.writer

	//_, err := writer.Write([]byte(":ping\r\n"))

	_, err := writer.Write([]byte("event: "))
	if err != nil {
		return err
	}
	_, err = writer.Write([]byte(event))
	if err != nil {
		return err
	}

	_, err = writer.Write([]byte("\r\ndata: "))
	if err != nil {
		return err
	}

	// copy buffer
	var buf = make([]byte, len(data))
	j := 0
	for i, b := range data {
		if b == '\n' {
			buf[j] = 0x1e
			j++
		} else if b != '\r' {
			buf[j] = data[i]
			j++
		}
	}
	buf = buf[:j]

	_, err = writer.Write(buf)
	if err != nil {
		return err
	}

	_, err = writer.Write([]byte("\r\n\r\n"))
	if err != nil {
		return err
	}

	return writer.Flush()
}

func (sess *Session) initReadChannel(quitch <-chan bool) {
	ch := make(chan byte)
	compressionSquence := []byte{IAC, SB, OPT_MCCP, IAC, SE}
	var seqix int
	compressionStarted := false
	var reader *bufio.Reader = sess.reader
	go func() {
		defer close(ch)
		for {
			b, err := reader.ReadByte()

			if err == io.EOF {
				return
			} else if err != nil {
				sess.errch <- err
				return
			}

			select {
			case ch <- b:
				break
			case <-quitch:
				return
			}

			if !compressionStarted && b == compressionSquence[seqix] {
				seqix++
				if seqix == len(compressionSquence) {
					seqix = 0
					zreader, err := zlib.NewReader(sess.reader)
					if err != nil {
						sess.writeOption(IAC, DONT, OPT_MCCP)
						errorlog.Println(err)
					} else {
						reader = bufio.NewReader(zreader)
						compressionStarted = true
					}
					//fmt.Println("Start compression.")
				}
			} else {
				seqix = 0
			}
		}
	}()
	sess.readch = ch
}

func (sess *Session) handleRead(b byte) error {
	if b == IAC {
		return sess.handleOption()
	} else {
		sess.buf = append(sess.buf, b)
	}
	return nil
}

func (sess *Session) readOptionByte(printable bool) (byte, error) {
	b, ok := <-sess.readch
	if !ok {
		return 0, ErrClosed
	}
	sess.DumpOptionByte(b, printable)
	return b, nil
}

func (sess *Session) handleOption() error {
	var err error
	sess.DumpOptionByte(IAC, false)
	first, err := sess.readOptionByte(false)
	if err != nil {
		return err
	}
	switch first {
	case EOR:
		err = sess.writeSocket()
		if err != nil {
			return err
		}
		sess.FlushTelnetBuffer()

	case SB:
		buf := sess.sbbuf[0:0]
		second, err := sess.readOptionByte(false)
		if err != nil {
			return err
		}
		for {
			if second == IAC {
				second, err := sess.readOptionByte(true)
				if err != nil {
					return err
				}
				if second == SE {
					break
				}
				buf = append(buf, IAC)
			} else {
				buf = append(buf, second)
				second, err = sess.readOptionByte(true)
				if err != nil {
					return err
				}
			}
		}
		sess.FlushTelnetBuffer()
		return sess.handleSb(buf)

	case DO:
		second, err := sess.readOptionByte(false)
		if err != nil {
			return err
		}
		sess.FlushTelnetBuffer()
		return sess.handleDo(second)

	case DONT:
		_, err = sess.readOptionByte(false)
		if err != nil {
			return err
		}
		sess.FlushTelnetBuffer()

	case WILL:
		second, err := sess.readOptionByte(false)
		if err != nil {
			return err
		}
		sess.FlushTelnetBuffer()
		return sess.handleWill(second)

	case WONT:
		_, err = sess.readOptionByte(false)
		if err != nil {
			return err
		}
		sess.FlushTelnetBuffer()

	default:
		sess.FlushTelnetBuffer()
	}

	return nil
}

func (sess *Session) handleSb(data []byte) error {
	var err error
	if len(data) < 1 {
		return nil
	}

	option := data[0]

	switch option {
	case OPT_TERM_TYPE:
		if len(data) != 2 || data[1] != SEND {
			return nil
		}
		err = sess.writeSb(OPT_TERM_TYPE, []byte{IS}, termtypes[sess.termtypeix])
		if err != nil {
			return err
		}
		sess.termtypeix = (sess.termtypeix + 1) % len(termtypes)

	case OPT_NEW_ENVIRON, OPT_ENVIRON:
		if len(data) < 2 || data[1] != SEND {
			return nil
		}
		return sess.writeSb(option, []byte{IS})

	case OPT_LINEMODE:
		if len(data) != 3 || data[1] != MODE {
			return nil
		}
		mask := data[2]
		if mask&MODE_ACK == MODE_ACK {
			return nil
		}

		replymask := mask | MODE_ACK
		return sess.writeSb(OPT_LINEMODE, []byte{MODE, replymask})

	case OPT_ATCP:
		return sess.writeSocketRaw("atcp", data[1:])
	}

	return nil
}

func (sess *Session) handleDo(second byte) error {
	var err error
	switch second {
	case OPT_ATCP:
		err = sess.writeOption(IAC, WILL, OPT_ATCP)
		if err != nil {
			return err
		}

		var options = []string{
			"hello Touche 0.1.x ALPHA",
			"room_brief 1",
			"room_exits 1",
			"ping 1",
			"keepalive 1",
			"char_vitals 1",
			"topvote 1",
			"composer 1",
			"map_display 1",
			"auth 0",
			"char_name 1",
		}

		/*var extraoptions = []string{
			"ava_set_mapper 1",
			"ava_set_channel 1",
			"ava_set_comm 1",
			"ava_set_rcomm 1",
		}
		*/

		err = sess.writeSbString(OPT_ATCP, strings.Join(options, "\n"))
		if err != nil {
			return err
		}

		/*
			for _, opt := range extraoptions {
				err = sess.writeSbString(OPT_ATCP, opt)
				if err != nil {
					return err
				}
			}
		*/

	case OPT_NAWS:
		return sess.writeOption(IAC, WILL, OPT_NAWS)
		//sess.writeOption(IAC, SB, OPT_NAWS, 0, 100, 0x13, 0x88, IAC, SE)

	case OPT_TERM_TYPE, OPT_ENVIRON, OPT_LINEMODE, OPT_NEW_ENVIRON:
		return sess.writeOption(IAC, WILL, second)

	case OPT_TIMING_MARK:
		err = sess.writeSocket()
		if err != nil {
			return err
		}
		return sess.writeOption(IAC, WILL, second)

	default:
		return sess.writeOption(IAC, WONT, second)
	}

	return nil
}

func (sess *Session) writeSb(option byte, data ...[]byte) error {
	size := 0
	for _, d := range data {
		size += len(d)
	}

	buf := make([]byte, 0, size+5)

	buf = append(buf, IAC, SB, option)
	sess.TelnetDebug("<- ")
	sess.DumpOptionByte(IAC, false)
	sess.DumpOptionByte(SB, false)
	sess.DumpOptionByte(option, false)

	for _, d := range data {
		buf = append(buf, d...)
		for _, b := range d {
			sess.DumpOptionByte(b, true)
		}
	}

	buf = append(buf, IAC, SE)
	sess.DumpOptionByte(IAC, false)
	sess.DumpOptionByte(SE, false)
	sess.FlushTelnetBuffer()

	_, err := sess.conn.Write(buf)
	return err
}

func (sess *Session) writeSbString(option byte, text string) error {
	return sess.writeSb(option, []byte(text))
}

func (sess *Session) handleWill(option byte) error {
	switch option {
	case OPT_MCCP, OPT_EOR:
		return sess.writeOption(IAC, DO, option)

	case OPT_MXP:
		return sess.writeOption(IAC, DO, option)

	case OPT_MSSP:
		return sess.writeOption(IAC, DO, OPT_MSSP)

	default:
		return sess.writeOption(IAC, DONT, option)
	}
}

func (sess *Session) writeOption(data ...byte) error {
	_, err := sess.conn.Write(data)
	if err != nil {
		return err
	}
	sess.TelnetDebug("<- ")
	for _, b := range data {
		sess.DumpOptionByte(b, false)
	}
	sess.FlushTelnetBuffer()

	return nil
}

func (sess *Session) TelnetDebug(text ...string) {
	if !Debugtelnet {
		return
	}
	for _, txt := range text {
		sess.debugbuf = append(sess.debugbuf, []byte(txt)...)
	}
}

func (sess *Session) DumpOptionByte(b byte, printable bool) {
	if b >= 240 {
		sess.TelnetDebug("<", OptionNames[b], ">")
	} else if printable && b >= 32 && b <= 126 {
		sess.TelnetDebug(string([]byte{b}))
	} else {
		sess.TelnetDebug("<", strconv.FormatInt(int64(b), 10), ">")
	}
}
