/**@jsx React.DOM */


var React = require('react');
var AppDispatcher = require('../AppDispatcher');
var _ = require('lodash');
var appstate = require('../appstate');
var Widget = require('./Widget');

var SpellActionButton = React.createClass({
    render: function() {
        var spanClass = 'spell-action fa fa-' + this.props.icon;
        var buttonStyle ={padding: '0 0.2rem', color: 'black'}; //#A5A7A7'};
        if (this.props.checked)
            spanClass += ' fa-inverse';
            //buttonStyle.color = 'white';

        return (
            <div className="topcoat-button-bar__item">
                <button className="topcoat-button-bar__button" style={buttonStyle} onClick={this.props.onClick} title={this.props.title}>
                    <span className={spanClass}></span>
                </button>
            </div>);
    }
});

var CastBar = React.createClass({
    render: function() {
        var padding = 100 - this.props.curr;
        if (padding > 100) padding = 100;
        if (padding < 0) padding = 0;

        var bar;

        if (this.props.running) {
            bar = <div className="statusline-bg">
                <div className="statusline" style={{'padding-right': padding + '%'}}/>
                <div className="statusline-inlinelabel">{this.props.lineLabel}</div>
            </div>;
        }

        return <div className="statusline-wrap">
            <div className="topcoat-button-bar spell-actions">
                <SpellActionButton onClick={this.props.onPerpetualClick} checked={this.props.perpetual} icon="repeat" title="Wiederholen"/>
                <SpellActionButton onClick={this.props.onMeasureClick} checked={this.props.measure} icon="floppy-o" title="Dauer speichern"/>
                <SpellActionButton onClick={this.props.onPlayStopClick} checked={this.props.running} icon={this.props.running?'stop':'play'} title={this.props.running?'Abbrechen':'Zaubern'}/>
            </div>      
            <div className="statusline-label">{this.props.label}</div>
            {bar}
        </div>;
    }
}); 

var spells = {
    arkanschild: {
        name: 'arkanschild',
        caption: 'Arkanschild',
        run: 'zz arkanschild',
        stop: 'z stop arkanschild',
        start: /^Du wirst von einem Arkanschild umgeben\./,
        end: /^Dein Arkanschild loest sich auf\./
    },
    magieaufladung: {
        name: 'magieaufladung',
        caption: 'Magieaufladung',
        run: 'z magieaufladung',
        stop: 'z stop magieaufladung',
        start: /^Du hast einen Teil Deiner regenerativen Energien in Deine Zauber umgelenkt\./,
        end: /^Deine Energien fliessen wieder normal\./
    },
    daemonenhaut: {
        name: 'daemonenhaut',
        caption: 'Dämonenhaut',
        run: 'zz daemonenhaut',
        stop: 'z stop daemonenhaut',
        start: /^Du bist nun vollkommen in eine Daemonenhaut eingehuellt\./,
        end: /^Deine Daemonenhaut loest sich auf\./,
        optional: true
    },
    windhaut: {
        name: 'windhaut',
        caption: 'Windhaut',
        run: 'zz windhaut',
        stop: 'z stop windhaut',
        start: /^Du bist nun vollkommen in eine Windhaut eingehuellt\./,
        end: /^Deine Windhaut loest sich auf\./,
        optional: true
    },
    feueraura: {
        name: 'feueraura',
        caption: 'Feueraura',
        run: 'zz feueraura',
        stop: 'z stop feueraura',
        start: /^Du senkst Deine Haende, aber der Schutz der Manawolken umgibt Dich/,
        end: /^Deine Feueraura loest sich auf\./,
        optional: true
    },
    erdaura: {
        name: 'erdaura',
        caption: 'Erdaura',
        run: 'zz erdaura',
        stop: 'z stop erdaura',
        start: /^Aus der Erde loesen sich kleine Partikel und bilden einen Schleier/,
        end: /^Dein Staubschleier loest sich auf./,
        optional: true
    },
    luftaura: {
        name: 'luftaura',
        caption: 'Luftaura',
        run: 'zz luftaura',
        stop: 'z stop luftaura',
        start: /^Du bist in den Watteflocken kaum noch auszumachen./,
        end: /^Deine Watteflocken loesen sich auf./,
        optional: true
    },
    wasseraura: {
        name: 'wasseraura',
        caption: 'Wasseraura',
        run: 'zz wasseraura',
        stop: 'z stop wasseraura',
        start: /^Es regnet aus der Wolke auf Dich herab, die Regentropfen treffen/,
        end: /^Dein Wasserschleier loest sich auf./,
        optional: true
    },
    sternenstaub: {
        name: 'sternenstaub',
        caption: 'Sternenstaub',
        run: 'zz sternenstaub',
        stop: 'z stop sternenstaub',
        start: /^Du wirst von Sternenstaub umgeben\./,
        end: /^Dein Sternenstaub loest sich auf\./,
        optional: true
    },
    todesaura: {
        name: 'todesaura',
        caption: 'Todesaura',
        run: 'zz feueraura',
        stop: 'z stop todesaura',
        start: /^Du senkst Deine Haende, aber der Schutz der schwarzen Schleier umgibt Dich/,
        end: /^Deine Todesaura loest sich auf\./,
        optional: true
    },
    blutrausch: {
        name: 'blutrausch',
        caption: 'Blutrausch',
        run: 'zz blutrausch',
        stop: 'z stop blutrausch',
        start: /^Du laesst einen fuerchterlichen Urschrei von Dir\./,
        end: /^Die roetlichen Manawolken loesen sich auf\./,
        optional: true
    }
    /*
    , manarausch: {
        caption: 'Manarausch',
        start: /Dichte Manawolken bilden nun einen gewaltigen Schutz um Dich herum\./,
    }
    */
};

var CastPanel = React.createClass({
    getInitialState: function() {
        return {spells: _.cloneDeep(spells), measurements: appstate.get('spellMeasurements') || {}};
    },
    onText: function(text) {
        var spells = this.state.spells;
        _.forEach(spells, function(spell, name) {
            if (spell.start.test(text)) {
                spell.running = true;
                spell.stats = {start: Date.now(), runlength: 0};
                this.setState({spells: spells});
                return false;
            } else if (spell.end.test(text)) {
                if (!spell.running)
                    return false;
                var start = spell.stats.start;
                spell.running = false;
                var measurements = this.state.measurements;

                if (spell.measure && !spell.manualStop) {
                    spell.measure = false;
                    measurements[name] = Date.now() - start;
                    appstate.set('spellMeasurements', measurements);
                }

                if (!spell.manualStop && spell.perpetual) {
                    this.runSpell(spell);
                }
                spell.manualStop = false;

                this.setState({spells: spells, measurements: measurements});
                return false;
            }
        }, this);
    },
    stopSpell: function(spell) {
        AppDispatcher.fire('send', 'cmd', spell.stop);
    },
    runSpell: function(spell) {
        AppDispatcher.fire('send', 'cmd', spell.run);
    },
    onTick: function() {
        var spells = this.state.spells;
        var activespells = _.filter(spells, 'running');
        if (activespells.length === 0)
            return;

        var measurements = this.state.measurements;
        var now = Date.now();
        _.forEach(activespells, function(activespell) {
            activespell.stats.runlength = now - activespell.stats.start;
            var measured = measurements[activespell.name];
            if (measured) {
                activespell.stats.left = measured - activespell.stats.runlength;
            }
        }, this);
        this.setState({spells: spells});
    },
    componentWillMount: function() {
        AppDispatcher.on('textline', this.onText);
        setInterval(this.onTick, 1000);
    },
    componentWillUnmount: function() {
        AppDispatcher.un('textline', this.onText);
        clearInterval(this.onTick);
    },
    onPerpetualClick: function(spell) {
        spell.perpetual = !spell.perpetual;
        this.setState({spells:this.state.spells});
    },
    onMeasureClick: function(spell) {
        spell.measure = !spell.measure;
        this.setState({spells:this.state.spells});
    },
    onPlayStopClick: function(spell) {
        if (spell.running) {
            spell.manualStop = true;
            this.stopSpell(spell);
        } else {
            this.runSpell(spell);
        }
    },
    render: function() {
        var state = this.state;
        var measured = this.state.measurements;
        var items = [];
        _.forEach(state.spells, function(spell, name) {
            var curr = 0;
            var label = spell.caption;
            var lineLabel;
            if (spell.running) {
                var m = measured[name];
                if (m) {
                    lineLabel = timeStr(m - spell.stats.runlength) + ' / ' + timeStr(m);
                    curr = spell.stats.left * 100 / m;
                } else {
                    lineLabel = timeStr(spell.stats.runlength);
                }
            }

            if (spell.running || !spell.optional) {
                items.push(<CastBar key={name} curr={curr} label={label} lineLabel={lineLabel}
                    perpetual={spell.perpetual} onPerpetualClick={this.onPerpetualClick.bind(this, spell)}
                    measure={spell.measure} onMeasureClick={this.onMeasureClick.bind(this, spell)}
                    running={spell.running} onPlayStopClick={this.onPlayStopClick.bind(this, spell)}/>);
            }
        }, this);
        return <Widget caption="Zauber" emptytext="Keine Zauber">{items}</Widget>;
    }
});

function timeStr(d) {
    d = new Date(d);
    return d.getMinutes() + ':' + (d.getSeconds() < 10?'0':'') + d.getSeconds();
}

require('../ComponentRegistry').defineValue('widget.CastPanel', CastPanel);
module.exports = CastPanel;
