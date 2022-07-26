const express = require('express');
const cors = require('cors');
const request = require('request');
const mysql      = require('mysql');
const crypto = require('crypto'); 

const connection = mysql.createConnection({
    host     : 'localhost',
    database : 'thy',
    user     : 'thyAdmin',
    password : 'thyAdmin',
});

const corsOptions ={
    origin:'*', 
    credentials:true,            //access-control-allow-credentials:true
    optionSuccessStatus:200,
 }

const app = express();

//TO DO: GENERATE UNIQUE TOKENS
function generateToken(n) {
    var chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    var token = '';
    for(var i = 0; i < n; i++) {
        token += chars[Math.floor(Math.random() * chars.length)];
    }
    return token;
}

app.use(express.json());
app.use(cors(corsOptions));

var url = 'https://api.turkishairlines.com/test/searchpassenger';


app.post('/login', (req, res) => {
    console.log(req.body.username, req.body.PNR, req.body.lastname);

    var queryParams = '?' + encodeURIComponent('lastname') + '=' 
    + encodeURIComponent(req.body.lastname) + '&'
    + encodeURIComponent('pnr') + '=' 
    + encodeURIComponent(req.body.PNR) + '&' 
    + encodeURIComponent('name') + '=' 
    + encodeURIComponent(req.body.username) + '&' 
    + encodeURIComponent('title') + '=' 
    + encodeURIComponent('MRS');

    request({
        url: url + queryParams,
        method: 'GET',
        headers: {apikey: 'l7xxd23189fd6f9342ae8a6c2cad21f148a3', apisecret: '844c4484e5ad4c7d8489eaa87a31b1e9'}
    }, function (error, response, body) {
        console.log('Status', response.statusCode);
        console.log('Headers', JSON.stringify(response.headers));
        let data = JSON.parse(body);
        console.log('Data : ', data.data.TripData.PassengerInfoList.PassengerInfo.PassengerName.GivenName);
        console.log('Data : ', data.data.TripData.PassengerInfoList.PassengerInfo.PassengerName.Surname);
        res.send(data);
    });
});

app.listen(3001, () => {
    console.log('Running server...');
});

connection.connect(function(err) {
    if (err) {
        console.error('Error connecting: ' + err.stack);
        return;
    }

    console.log('Connected as id ' + connection.threadId);
});

/*
app.get('/getuser', (req, res) => {
    //req.query['smth']

    //debug
    //console.log(req);

    if(req.query['userID']){
        //TO DO : REGEX FOR SECURITY

        connection.query('SELECT * FROM userTable WHERE userID=' + req.query['userID'], function (error, results, fields) {
            if (error)
                throw error;
        
            results.forEach(result => {
                console.log(result);
                res.send(result);
                return;
            });
        });
    }else{
        res.send('Invalid Parameters');
    }
    
});
*/

//------------------------- PORT ADMIN -----------------------------

app.post('/adminlogin', function(req, res) {
    const name = connection.escape(req.body.adminName);
    const pass = connection.escape(req.body.adminPass);
    
    if(!name || !pass){
        res.send({result: false, message: "Invalid Parameters"});
        return;
    }
    var sql = 'SELECT * FROM adminTable \
    WHERE adminTable.adminName=' + name;
    connection.query(sql, function (error, results, fields) {
        if (error)
            throw error;
        
        if(results.length < 1){
            res.send({result: false, message: "Invalid Admin Account"});
            return;
        }

        var hash = crypto.pbkdf2Sync(pass,  results[0]['adminPassSalt'], 1000, 64, `sha512`).toString(`hex`);
        
        if(results[0]['adminPass'] == hash){
            res.send({result: true});
        }else{
            res.send({result: false, message: "Invalid Admin Account"});
        }
       
    });
});

app.post('/registerAdmin', function(req, res) {
    const name = connection.escape(req.body.adminName);
    const pass = connection.escape(req.body.adminPass);
    const nickname = connection.escape(req.body.adminNickname);
    
    if(!name || !pass || !nickname){
        res.send({result: false, message: "Invalid Parameters"});
        return;
    }

    var sql = 'SELECT * FROM adminTable \
    WHERE adminTable.adminName=' + name + ' OR adminTable.adminNickname=' + nickname + '';
    connection.query(sql, function (error, results, fields) {
        if (error)
            throw error;
        
        if(results.length > 0){
            res.send({result: false, message: "Admin Credientals Already In Use"});
            return;
        }

        const salt = crypto.randomBytes(16).toString('hex'); 
        const hash = crypto.pbkdf2Sync(pass, salt,  1000, 64, `sha512`).toString(`hex`); 


        var sql = 'INSERT INTO adminTable \
            (adminNickname ,adminName, adminPass, adminPassSalt) \
            VALUES (' + nickname + ' ,\
            ' + name + ' ,\
            \'' + hash + '\' ,\
            \'' + salt + '\')';
        connection.query(sql, function (error, results, fields) {
            if (error)
                throw error;
            
            res.send({result: true, message: 'User Created Successfully'});
        });
    });
});

//------------------------- CLIENT -----------------------------

app.post('/getupdates', (req, res) => {
    //debug
    //console.log(req);
    const pnr = connection.escape(req.body.pnrID);
    const ownerName = connection.escape(req.body.ownerName);
    const ownerSurname = connection.escape(req.body.ownerSurname);

    /*
    if(req.query['baggageToken']){

        var sql = 'SELECT * FROM baggageUpdates \
        JOIN scannerTable ON baggageUpdates.scannerID = scannerTable.scannerID \
        JOIN baggageTable ON baggageUpdates.baggageToken = baggageTable.baggageToken\
        WHERE baggageTable.baggageToken=' + req.query['baggageToken'] + '';
        connection.query(sql, function (error, results, fields) {
            if (error)
                throw error;
            
            var ret = {};

            results.forEach(result => {
                if(ret[result['baggageID']] == undefined){
                    ret[result['baggageID']] = {
                        baggageName: result['baggageName'],
                        scannerList: []
                    };
                }

                ret[result['baggageID']]['scannerList'].push({
                    scannerName: result['scannerName'],
                    updateTime: result['updateTime']
                });
    
            });
            
            console.log(ret);
            res.send(JSON.stringify(ret));
        });
    }else 
    */
    if(pnr && ownerName && ownerSurname){
        var sql = 'SELECT * FROM baggageTable \
        JOIN adminTable ON adminTable.adminID = baggageTable.registrarAdminID\
        WHERE baggageTable.ownerPNR=' + pnr + '  AND \
        baggageTable.ownerName=' + ownerName + '  AND \
        baggageTable.ownerSurname=' + ownerSurname + '';

        var ret = {result: true, baggages: {}};
        var found = false;
        connection.query(sql, function (error, results, fields) {
            if (error)
                throw error;

            results.forEach(result => {
                found = true;
                if(ret['baggages'][result['baggageID']] == undefined){
                    ret['baggages'][result['baggageID']] = {
                        baggageName: result['baggageName'],
                        registrarAdmin: result['adminNickname'],
                        scannerList: []
                    };
                }
            });

            if(!found){
                res.send({result: false, message: "Couldn't Find Any Baggages"});
                
                return;
            }

            var sql = 'SELECT * FROM baggageUpdates \
            JOIN scannerTable ON baggageUpdates.scannerID = scannerTable.scannerID \
            JOIN baggageTable ON baggageUpdates.baggageToken = baggageTable.baggageToken\
            JOIN adminTable ON baggageTable.registrarAdminID = adminTable.adminID\
            WHERE baggageTable.ownerPNR=' + pnr + '  AND \
            baggageTable.ownerName=' + ownerName + '  AND \
            baggageTable.ownerSurname=' + ownerSurname + '';
            connection.query(sql, function (error, results, fields) {
                if (error)
                    throw error;
                
                results.forEach(result => {

                    ret['baggages'][result['baggageID']]['scannerList'].push({
                        scannerName: result['scannerName'],
                        updateTime: result['updateTime']
                    });

                });
                res.send(ret);
            });

        });

    }else{
        res.send({result: false, message: "Invalid Parameters"});
    }
    
});

//------------------------- SCANNERS -----------------------------

app.post('/scanBaggage', function(req, res) {
    const baggageToken = connection.escape(req.body.baggageToken);
    const scannerToken = connection.escape(req.body.scannerToken);
    
    if(!baggageToken || !scannerToken){
        res.send({result: false, message: "Invalid Parameters"});
        return;
    }

    var sql = 'SELECT * FROM scannerTable \
    WHERE scannerTable.scannerToken=' + scannerToken + '';
    connection.query(sql, function (error, results, fields) {
        if (error)
            throw error;
        
        if(results.length < 1){
            res.send({result: false, message: "Invalid Scanner Token"});
            return;
        }
        var scannerID = results[0]['scannerID'];
        var sql = 'SELECT * FROM baggageTable \
        WHERE baggageTable.baggageToken=' + baggageToken + '';
        connection.query(sql, function (error, results, fields) {
            if (error)
                throw error;
            
            if(results.length < 1){
                res.send({result: false, message: "Invalid Baggage Token"});
                return;
            }
    
            var sql = 'INSERT INTO baggageUpdates \
            (scannerID, baggageToken) \
            VALUES (\'' + scannerID + '\' ,\
            ' + baggageToken + ')';
    
            connection.query(sql, function (error, results, fields) {
                if (error)
                    throw error;
                
                res.send({result: true, message: "Scanner Entry Successfully Created"});
            }); 
        });
    });
});

app.post('/registerScanner', function(req, res) {
    const name = connection.escape(req.body.adminName);
    const pass = connection.escape(req.body.adminPass);

    const scannerName = connection.escape(req.body.scannerName);
    
    if(!name || !pass || !scannerName){
        res.send({result: false, message: "Invalid Parameters"});
        return;
    }

    var sql = 'SELECT * FROM adminTable \
    WHERE adminTable.adminName=' + name;
    connection.query(sql, function (error, results, fields) {
        if (error)
            throw error;
        
        if(results.length < 1){
            res.send({result: false, message: "Invalid Admin Account"});
            return;
        }

        var hash = crypto.pbkdf2Sync(pass,  results[0]['adminPassSalt'], 1000, 64, `sha512`).toString(`hex`);
        
        if(results[0]['adminPass'] == hash){
            const token = generateToken(32);
            var sql = 'INSERT INTO scannerTable \
            (scannerName, scannerToken) \
            VALUES (' + scannerName + ' ,\
            \'' + token + '\')';

            connection.query(sql, function (error, results, fields) {
                if (error)
                    throw error;
                
                res.send({result: true, message: "Scanner Entry Successfully Created", token: token});
            }); 
        }else{
            res.send({result: false, message: "Invalid Admin Account"});
        }
       
    });
});

//------------------------- BAGGAGES -----------------------------

app.post('/registerBaggage', (req, res) => {
    //debug
    //console.log(req);
    const name = connection.escape(req.body.adminName);
    const adminPass = connection.escape(req.body.adminPass);

    const baggageName = connection.escape(req.body.baggageName);
    const pnr = connection.escape(req.body.pnrID);
    const ownerName = connection.escape(req.body.ownerName);
    const ownerSurname = connection.escape(req.body.ownerSurname);

    if(name && adminPass && baggageName && pnr && ownerName && ownerSurname){
        var sql = 'SELECT * FROM adminTable \
        WHERE adminTable.adminName=' + name;
        connection.query(sql, function (error, results, fields) {
            if (error)
                throw error;
            
            if(results.length < 1){
                res.send({result: false, message: "Invalid Admin Account"});
                return;
            }

            var hash = crypto.pbkdf2Sync(adminPass,  results[0]['adminPassSalt'], 1000, 64, `sha512`).toString(`hex`);
            
            if(results[0]['adminPass'] == hash){
                const token = generateToken(32);
                var sql = 'INSERT INTO baggageTable \
                (registrarAdminId, baggageName, baggageToken, ownerPNR, ownerName, ownerSurname) \
                VALUES (\'' + results[0]['adminID'] + '\' ,\
                ' + baggageName + ' ,\
                \'' + token + '\' ,\
                ' + pnr + ' ,\
                ' + ownerName + ' ,\
                ' + ownerSurname + ')';

                connection.query(sql, function (error, results, fields) {
                    if (error)
                        throw error;
                    
                    res.send({result: true, message: "Baggage Entry Successfully Created", token: token});
                }); 

            }else{
                res.send({result: false, message: "Invalid Admin Account"});
            }
        
        });
    }else{
        res.send({result: false, message: "Invalid Parameters"});
    }
    
});

app.post('/deleteBaggage', function(req, res) {
    //TO DO : COUNT DELETED ROWS
    const name = connection.escape(req.body.adminName);
    const pass = connection.escape(req.body.adminPass);

    const baggageToken = connection.escape(req.body.baggageToken);
    
    if(!name || !pass || !baggageToken){
        res.send({result: false, message: "Invalid Parameters"});
        return;
    }
    
    var sql = 'SELECT * FROM adminTable \
    WHERE adminTable.adminName=' + name;
    connection.query(sql, function (error, results, fields) {
        if (error)
            throw error;
        
        if(results.length < 1){
            res.send({result: false, message: "Invalid Admin Account"});
            return;
        }

        var hash = crypto.pbkdf2Sync(pass,  results[0]['adminPassSalt'], 1000, 64, `sha512`).toString(`hex`);
        
        if(results[0]['adminPass'] == hash){
            var sql = 'DELETE FROM baggageTable \
            WHERE baggageTable.baggageToken = \
            ' + baggageToken + '';

            connection.query(sql, function (error, results, fields) {
                if (error)
                    throw error;
            }); 

            var sql = 'DELETE FROM baggageUpdates \
            WHERE baggageUpdates.baggageToken = \
            ' + baggageToken + '';

            connection.query(sql, function (error, results, fields) {
                if (error)
                    throw error;
            }); 

            res.send({result: true, message: "Baggage Entries Successfully Deleted!"});
        }else{
            res.send({result: false, message: "Invalid Admin Account"});
        }
       
    });

});
