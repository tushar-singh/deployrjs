const chalk = require('chalk');
const express = require('express');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const git = require('git-promise');

class Deployr {

    constructor({ key, port = 4000 }) {
        this.key = key;
        this.port = port;
    }

    listen = callback => {
        // Create express server
        const app = express();

        // parse JSON
        // (Github web hooks send JSON)
        app.use(bodyParser.urlencoded({ extended: false }));
        app.use(bodyParser.json());

        // handle POST requests
        app.post('*', (req, res) => {
            if (this.key) {
                // Verify SHA1 encrypted secret key
                // This is to make sure no one can send a bogus requests
                const hmac = crypto.createHmac('sha1', this.key);
                hmac.update(JSON.stringify(req.body));
                const sig = 'sha1=' + hmac.digest('hex');

                // Key mismatch
                // Likely bogus request. stop executing
                if (req.headers['x-hub-signature'] !== sig) return;
            }

            // We're good to go
            console.log(chalk.gray('-----------------------------------'));
            this.log(chalk.yellow.bold('✨  Starting deployment...'));

            callback(req, this.pull);

            res.send('deploying');
        });

        app.listen(this.port, err => {
            if (err) {
                console.error(err);
                return;
            }

            this.log(`🌐  Listening on port ${this.port}`);
        });
    }

    // Get latest from github
    // This also runs `git reset --hard`
    // to make sure we're identical to github repo
    pull = () =>
        new Promise((resolve, reject) => {
            this.log('Git: start');

            git('reset --hard')
                .then(() => git('pull'))
                .then(() => {
                    this.log('Git: finished');
                    resolve();
                })
                .fail(err => {
                    console.log(err.stdout);
                    reject(err);
                });
        })

    log = message => {
        console.log(chalk.gray('[deployr] ') + message);
    }
}

module.exports = Deployr;