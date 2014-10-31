GO=go
GULP=gulp
RM=rm
SSH=SSH
HOST=ubuntu@avalon.hij.cc
KEY=~/azure/key.pem
SCP=scp

SRC=main.go

.PHONY: client clean all run clean clean-client clean-server publish-all publish-server publish-client

all: bin/avalon client

run:
	$(GO) run $(SRC)

bin/avalon: $(SRC)
	#GOOS=linux GOARCH=amd64 $(GO) build -o bin/avalon -tags newrelic $(SRC)
	GOOS=linux GOARCH=amd64 $(GO) build -o bin/avalon $(SRC)

bin/touche.linux.x86-32: $(SRC)
	GOOS=linux GOARCH=386 $(GO) build -o bin/touche.linux.x86-32 $(SRC)

bin/touche.linux.x86-64: $(SRC)
	GOOS=linux GOARCH=amd64 $(GO) build -o bin/touche.linux.x86-64 $(SRC)

clean-client:
	$(RM) -rf dist

clean-server:
	$(RM) bin/avalon

clean: clean-client clean-server

client:
	$(GULP)

publish-all: publish-client publish-server

publish-client: clean-client client
	$(SCP) -oIdentityFile=$(KEY) -r dist ubuntu@avalon.hij.cc:ava

publish-server: clean-server bin/avalon
	#-$(SSH) $(HOST) -i $(KEY) "cd ava && ./stop"
	$(SCP) -oIdentityFile=$(KEY) -r bin/avalon ubuntu@avalon.hij.cc:ava/avalon.new
	#$(SSH) $(HOST) -i $(KEY) "cd ava && ./start"

dist: bin/touche.linux.x86-32 bin/touche.linux.x86-64 clean-client client
	-rm touche.tgz
	tar -czf touche.tgz dist -C bin touche.linux.x86-32 touche.linux.x86-64

