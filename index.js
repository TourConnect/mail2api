require('dotenv').config()
const express = require('express')
const app = express()
const inspect = require('util').inspect
const Imap = require('imap')
const simpleParser = require('mailparser').simpleParser
const settings = {
  user: process.env.EMAIL_IMAP_EMAIL,
  password: process.env.EMAIL_IMAP_PASSWORD,
  host: process.env.EMAIL_IMAP_SERVER,
  port: 993,
  tls: true
}
Date.prototype.addHours = function(h) {
   this.setTime(this.getTime() + (h*60*60*1000));
   return this;
}

app.get('/', (req, res) => {
  const retval = []
  const imap = new Imap(settings);
  function openInbox(cb) {
    imap.openBox('INBOX', true, cb);
  }
  imap.once('ready', function() {
    openInbox(function(err, box) {
      if (err) throw err;
      imap.search([ 'ALL', ['SINCE', (new Date()).addHours(-1)] ], function(err, results) {
        if (err){
          console.log(err)
          imap.end();
          return
        }
        console.log(`${results.length} messages found !`);
        if (results.length === 0){
          imap.end();
          return
        }
        var f = imap.fetch(results, { bodies: '' });
        f.on('message', function(msg, seqno) {
          console.log('Message #%d', seqno);
          var prefix = '(#' + seqno + ') ';
          msg.on('body', function(stream, info) {
            var buffer = '';
            var bufferBody = '';
            stream.on('data', function(chunk) {
              buffer += chunk.toString('utf8');
            });
            stream.once('end', function() {
              //console.log(buffer)
              simpleParser(buffer, (err, mail)=>{
                if(err) console.log(err)
                const toPush = {
                  to: mail.to.text,
                  subject: mail.subject,
                  body: mail.html
                }
                console.log(`<${toPush.to}>${toPush.subject}`)
                retval.push(toPush)
              })

              // console.log(prefix + 'Parsed header: %s', inspect(Imap.parseHeader(buffer)));
            });
          });

          msg.once('attributes', function(attrs) {
            console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
          });
          msg.once('end', function() {
            console.log(prefix + 'Finished');
          });
        });
        f.once('error', function(err) {
          console.log('Fetch error: ' + err);
        });
        f.once('end', function() {
          console.log('Done fetching all messages!');
          imap.end();
        });
      })
    });
  });

  imap.once('error', function(err) {
    console.log(err);
  });

  imap.once('end', function() {
    console.log('Connection ended');
    res.json(retval);
  });

  imap.connect();
  //res.send('Hello World!')
})

app.listen(3000, () => {
  console.log('Example app listening on port 3000!')
})
