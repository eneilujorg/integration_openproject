const express = require('express')
var axios = require('axios');
var http = require('http');
var cors = require('cors')
var request = require('request');
const app = express()
const port = 3000

app.use(express.json()) // for parsing application/json
app.use(express.urlencoded({ extended: true })) // for parsing application/x-www-form-urlencoded
app.use('/', express.static(__dirname + '/UI/dist'));
app.post('/token', async (req, res) => {
    let result = await axios({
        headers: { "Content-Type": "application/json" },
        method: "post",
        url: `${req.body.host}/index.php/apps/integration_openproject/direct-upload-token`,
        auth: {
            username: req.body.username,
            password: req.body.password
        },
        data: {
            folder_id: req.body.folder_id
        }
    });
    console.log(result.data.token)
    res.json({"token":result.data.token})
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})


