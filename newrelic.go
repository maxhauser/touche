// +build newrelic

package main

import (
	"flag"
	"github.com/yvasiyarov/gorelic"
	"github.com/yvasiyarov/newrelic_platform_go"
)

var newRelicLicense = flag.String("newreliclicense", "", "New Relic License")

type connectionsMetric int

func (metric *connectionsMetric) GetName() string {
	return "Sessions"
}

func (metric *connectionsMetric) GetUnits() string {
	return "Sessions"
}

func (metric *connectionsMetric) GetValue() (float64, error) {
	return float64(*metric), nil
}

func (metric *connectionsMetric) SessionCreated() {
	*metric = connectionsMetric(int(*metric) + 1)
}

func (metric *connectionsMetric) SessionClosed() {
	*metric = connectionsMetric(int(*metric) - 1)
}

func init() {
	if *newRelicLicense != "" {
		agent := gorelic.NewAgent()
		agent.Verbose = false
		agent.NewrelicLicense = *newRelicLicense
		agent.NewrelicName = "Avalon Web System"
		agent.Run()

		plugin := newrelic_platform_go.NewNewrelicPlugin("0.0.1", *newRelicLicense, 20)
		component := newrelic_platform_go.NewPluginComponent("Avalon Web App", "cc.hij.avalon.webapp")
		plugin.AddComponent(component)

		metric := new(connectionsMetric)
		component.AddMetrica(metric)
		go plugin.Run()

		trace = metric
	}
}
