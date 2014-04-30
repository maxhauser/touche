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
	mime.AddExtensionType(".otf", "font/opentype")

	flag.BoolVar(&session.Debugtelnet, "debug", false, "Telnet debugging")
	flag.BoolVar(&session.Compression, "compression", false, "Use gzip compression")
	flag.IntVar(&session.MaxSessionConnections, "multimaxconn", 2, "Max. connection count per session")

	flag.Parse()
}

func main() {
	if *pidFile != "" {
		var pid = os.Getpid()
		ioutil.WriteFile(*pidFile, []byte(strconv.FormatInt(int64(pid), 10)), os.FileMode(0644))
	}

	var handler = http.FileServer(http.Dir("./dist"))
	http.HandleFunc("/", func(writer http.ResponseWriter, req *http.Request) {
		if req.URL.Path != "" && req.URL.Path != "/" {
			writer.Header().Add("Cache-Control", "max-age=31536000, public, no-transform")
			writer.Header().Add("Content-Encoding", "gzip")
		}

		handler.ServeHTTP(writer, req)
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
			if trace != nil {
				trace.SessionClosed()
			}
		})
		if err == nil {
			lock.Lock()
			defer lock.Unlock()
			sessions[sess.Id()] = sess
		}
		if trace != nil {
			trace.SessionCreated()
		}
	})

	var scheme string
	if *ssl {
		scheme = "https"
	} else {
		scheme = "http"
	}

	fmt.Printf("Server is running (listening on %s://%s/)\n", scheme, *address)

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

	sess.Attach(w, r)
	return true
}
