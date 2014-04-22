package session

import (
	"errors"
	"log"
	"net"
	"sync"
)

var ErrMaxConnection = errors.New("Maximum connection count reached")

type multiWriterEntry struct {
	conn   net.Conn
	writer writerFlusher
}

type multiWriter struct {
	entries []multiWriterEntry
	lock    sync.RWMutex
}

func NewMultiWriter(conn net.Conn, writer writerFlusher) *multiWriter {
	return &multiWriter{entries: []multiWriterEntry{multiWriterEntry{conn, writer}}}
}

func (w *multiWriter) attach(conn net.Conn, writer writerFlusher) error {
	w.lock.Lock()
	defer w.lock.Unlock()
	if len(w.entries) >= MaxSessionConnections {
		log.Println("max connections for session reached.")
		return ErrMaxConnection
	}

	w.entries = append(w.entries, multiWriterEntry{conn, writer})
	return nil
}

func (w *multiWriter) Close() {
	for _, entry := range w.entries {
		entry.conn.Close()
	}
	w.entries = nil
}

func (w *multiWriter) Flush() error {
	w.lock.RLock()
	defer w.lock.RUnlock()

	entries := w.entries
	var err error

	for i := len(entries) - 1; i >= 0; i-- {
		e := entries[i]
		err = e.writer.Flush()
		if err != nil {
			e.conn.Close()
			entries[i] = entries[len(entries)-1]
			entries = entries[0 : len(entries)-1]
		}
	}

	w.entries = entries

	if len(entries) == 0 {
		return err
	}

	return nil
}

func (w *multiWriter) Write(p []byte) (int, error) {
	w.lock.RLock()
	defer w.lock.RUnlock()

	entries := w.entries
	var err error
	var lstcnt, cnt int

	for i := len(entries) - 1; i >= 0; i-- {
		e := entries[i]
		cnt, err = e.writer.Write(p)
		if err != nil {
			e.conn.Close()
			entries[i] = entries[len(entries)-1]
			entries = entries[0 : len(entries)-1]
			log.Println("detaching session.")
		} else {
			lstcnt = cnt
		}
	}

	w.entries = entries

	if len(entries) == 0 {
		return cnt, err
	}

	return lstcnt, nil
}
