package session

import (
	"io"
)

type writerFlusher interface {
	io.Writer
	Flush() error
}

type writeThroughFlusher struct {
	outer, inner writerFlusher
}

func newWriteThroughFlusher(outer, inner writerFlusher) writerFlusher {
	return &writeThroughFlusher{outer, inner}
}

func (w *writeThroughFlusher) Write(data []byte) (int, error) {
	return w.outer.Write(data)
}

func (w *writeThroughFlusher) Flush() error {
	err := w.outer.Flush()
	if err != nil {
		return err
	}
	return w.inner.Flush()
}
