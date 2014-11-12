package main

import (
	"./session"
	"flag"
	"fmt"
	"io/ioutil"
	"log"
	"mime"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
)

type sessionTrace interface {
	SessionCreated()
	SessionClosed()
}

var trace sessionTrace

var (
	address  = flag.String("address", "localhost:10080", "Bind to address")
	ssl      = flag.Bool("ssl", false, "Use ssl")
	certFile = flag.String("certfile", "cert.pem", "The Cert file")
	keyFile  = flag.String("keyfile", "key.pem", "The Key file")
	pidFile  = flag.String("pidfile", "", "The pid file")
	multi    = flag.Bool("multi", false, "Enable multiple connections for a session")
)

var lock sync.RWMutex
var sessions = make(map[string]*session.Session)

func init() {
	mime.AddExtensionType(".map", "application/json")
	mime.AddExtensionType(".otf", "font/otf")
	mime.AddExtensionType(".eot", "application/vnd.ms-fontobject")
	mime.AddExtensionType(".woff", "application/x-font-woff")
	mime.AddExtensionType(".svg", "image/svg+xml")
	mime.AddExtensionType(".ttf", "font/ttf")

	flag.BoolVar(&session.Debugtelnet, "debug", false, "Telnet debugging")
	flag.BoolVar(&session.Compression, "compression", false, "Use gzip compression")
	flag.BoolVar(&session.SendRemoteIp, "sendremoteip", false, "Send the remote ip to the mud")
	flag.IntVar(&session.MaxSessionConnections, "multimaxconn", 2, "Max. connection count per session")
	flag.BoolVar(&session.Insecure, "insecure", false, "Plain text connection to avalon server")
	flag.StringVar(&session.ServerAddress, "serveraddress", "", "Avalon server address to connect to (defaults to avalon.mud.de:7777/7778")

	flag.Parse()
}

func main() {
	if *pidFile != "" {
		var pid = os.Getpid()
		ioutil.WriteFile(*pidFile, []byte(strconv.FormatInt(int64(pid), 10)), os.FileMode(0644))
	}

	http.HandleFunc("/", func(writer http.ResponseWriter, req *http.Request) {

		if req.URL.Path != "" && req.URL.Path != "/" {
			writer.Header().Add("Cache-Control", "max-age=31536000, public, no-transform")
		}

		gzipOk := false
		acceptedEncodings := strings.Split(req.Header.Get("Accept-Encoding"), ",")
		for _, encoding := range acceptedEncodings {
			if encoding == "gzip" {
				gzipOk = true
				break
			}
		}

		name := "dist" + req.URL.Path
		if gzipOk {
			file, err := os.Open(name + ".gz")

			if err == nil {
				writer.Header().Add("Content-Encoding", "gzip")
				stat, _ := file.Stat()
				http.ServeContent(writer, req, name, stat.ModTime(), file)
				file.Close()
				return
			}
		}
		http.ServeFile(writer, req, name)
	})

	notfound := http.NotFoundHandler()

	http.HandleFunc("/mud/", func(w http.ResponseWriter, r *http.Request) {
		comps := strings.Split(r.URL.Path, "/")

		if len(comps) == 4 {
			id := comps[2]

			body, err := ioutil.ReadAll(r.Body)
			if err != nil {
				return
			}

			sess, ok := func(id string) (*session.Session, bool) {
				lock.RLock()
				defer lock.RUnlock()
				sess, ok := sessions[id]
				return sess, ok
			}(id)

			if !ok || sess == nil {
				notfound.ServeHTTP(w, r)
				return
			}

			cmd := comps[3]
			if cmd == "cmd" {
				sess.SendCommand(string(body))
			} else if cmd == "naws" {
				var w, h int
				_, err := fmt.Sscanf(string(body), "%d,%d", &w, &h)
				if err == nil {
					sess.SendNaws(byte(w), byte(h))
				}
			} else if cmd == "atcp" {
				sess.SendAtcp(string(body))
			} else if cmd == "mxp" {
				sess.SendMxp(string(body))
			}
		}
	})

	http.HandleFunc("/mud", func(w http.ResponseWriter, r *http.Request) {
		var sess *session.Session

		var sid string

		if *multi {
			sid = r.URL.Query().Get("sid")

			if sid != "" {
				if attachToExistingSession(sid, w, r) {
					return
				}
			}
		}

		var err error
		sess, err = session.NewSession(sid, w, r, func() {
			lock.Lock()
			defer lock.Unlock()
			delete(sessions, sess.Id())
			log.Printf("session ended %s.", plural(len(sessions)))
			if trace != nil {
				trace.SessionClosed()
			}
		})

		if err == nil {
			lock.Lock()
			defer lock.Unlock()
			sessions[sess.Id()] = sess

			log.Printf("session started %s.", plural(len(sessions)))

			if trace != nil {
				trace.SessionCreated()
			}
		} else {
			log.Printf("error on session start: %s", err.Error())
		}

	})

	var scheme string
	if *ssl {
		scheme = "https"
	} else {
		scheme = "http"
	}

	fmt.Printf("touche server is running (listening on %s://%s/)\n", scheme, *address)

	if *ssl {
		log.Fatal(http.ListenAndServeTLS(*address, *certFile, *keyFile, nil))
	} else {
		log.Fatal(http.ListenAndServe(*address, nil))
	}
}

func attachToExistingSession(sid string, w http.ResponseWriter, r *http.Request) bool {
	lock.RLock()
	defer lock.RUnlock()

	sess, ok := sessions[sid]
	if !ok {
		return false
	}

	err := sess.Attach(w, r)
	if err == nil {
		log.Printf("session attached %s.", plural(len(sessions)))
	} else {
		log.Printf("error on session attach: %s", err.Error())
	}

	return true
}

func plural(value int) string {
	if value == 0 {
		return "(no active sessions)"
	} else if value == 1 {
		return "(1 active session)"
	} else {
		return "(" + strconv.Itoa(value) + " active sessions)"
	}
}
