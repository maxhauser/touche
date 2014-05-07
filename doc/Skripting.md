Skripting
=========

Beispiele
---------

### Benachrichtigungen (in Safari oder Chrome)

1.) Skripting einschalten
$$enable scripting

2. Erlaubnis für Benachrichtigungen einholen (nur 1x für die Website notwendig) 
@Notification.requestPermission()

3. Trigger für Benachrichtigung bei Info Meldungen
@act /Info:\s*(.*)/, (_,info) => new Notification info

4. Trigger entfernen
@unact /Info:\s*(.*)/
