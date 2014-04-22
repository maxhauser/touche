GO=go
GULP=gulp
RM=rm
SSH=SSH
HOST=ubuntu@avalon.hij.cc
KEY=~/azure/key.pem
SCP=scp

SRC=main.go newrelic.go

.PHONY: client clean all run clean clean-client clean-server publish-all publish-server publish-client

all: bin/avalon client

run:
	$(GO) run $(SRC)

bin/avalon: $(SRC)
	GOOS=linux GOARCH=amd64 $(GO) build -o bin/avalon -tags newrelic $(SRC)

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
