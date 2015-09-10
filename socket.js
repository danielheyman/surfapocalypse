// var app = require('express')();
// var http = require('http').Server(app);
// var io = require('socket.io')(http);
// var Redis = require('ioredis');
// var redis = new Redis();
// redis.subscribe('global', function(err, count) {
// });
//
// redis.on('message', function(channel, message) {
//     console.log('Message Recieved: ' + message);
//     message = JSON.parse(message);
//     io.emit(channel + ':' + message.event, message.data);
// });
//
// http.listen(3000, function(){
//     console.log('Listening on Port 3000');
// });







var base_path = __dirname.replace('resources/nodejs', '');
require('dotenv').config({
    path: base_path+'/.env'
});

var port = process.env.NODE_SERVER_PORT,
Redis = require('ioredis'),
redis = new Redis(),
redis_client = Redis.createClient(),
cookie = require('cookie'),
os = require('os'),
MCrypt = require('mcrypt').MCrypt,
PHPUnserialize = require('php-unserialize'),
http = require('http'),
fs = require('fs'),

server = require('http').createServer(),
io = require('socket.io')(server);

offline_timeout = {};
map_timeout = {};
users = {};
locations = {};

server.listen(port, function(){
     console.log('Listening on Port 3000');
});

io.use(function(socket, next)
{
    console.log(next);

    var interfaces = os.networkInterfaces();
    var addresses = [];
    for (k in interfaces) {
        for (k2 in interfaces[k]) {
            var address = interfaces[k][k2];
            if (address.family == 'IPv4' && !address.internal) {
                addresses.push(address.address)
            }
        }
    }

    if(socket.request.connection.remoteAddress == '127.0.0.1' || addresses.indexOf(socket.request.connection.remoteAddress) >= 0)
    {
        console.log('From Server');
        next();
    }
    else
    {
        if(typeof socket.request.headers.cookie != 'undefined')
        {
            var userCookie = cookie.parse(socket.request.headers.cookie).laravel_session;

            if(typeof userCookie != 'undefined')
            {
                redis_client.get('laravel:' + decryptCookie(userCookie), function(error, result)
                {
                    if (error)
                    {
                        console.log('ERROR');
                        next(new Error(error));
                    }
                    else if (result)
                    {
                        laravelSession = PHPUnserialize.unserialize( PHPUnserialize.unserialize( result ) );
                        socket.user_id = laravelSession['login_82e5d2c56bdd0811318f0cf078b78bfc'];
                        socket.name = laravelSession['name'];

                        clearTimeout(offline_timeout[socket.user_id]);

                        users[socket.user_id] = {
                            socket_info: socket
                        };

                        next();
                    }
                    else
                    {
                        console.log('Not Authorized');
                        next(new Error('Not Authorized'));
                    }
                });
            }
            else
            {
                console.log('Not Authorized');
                next(new Error('Not Authorized'));
            }
        }
        else
        {
            console.log('Not Authorized');
            next(new Error('Not Authorized'));
        }
    }
});

redis.subscribe('global', function(err, count) {

});

redis.on('message', function(channel, message) {
    console.log('Message Recieved: ' + message);
    message = JSON.parse(message);
    io.emit(channel + ':' + message.event, message.data);
});

io.on('connection', function (socket)
{
    console.log(socket.user_id + ' joined');
    // socket.on('join', function ()
    // {
    //     clearTimeout(offline_timeout[socket.user_id]);
    //
    //     if(!users[socket.user_id])
    //     {
    //         users[socket.user_id] = {
    //             socket_info: socket
    //         };
    //     }
    //     else
    //     {
    //         //socket.leave(users[user_info.id].location);
    //         //users[user_info.id].location = user_info.location;
    //     }
    //     //socket.join(user_info.location);
    // });

    socket.on('chat', function (message)
    {
        if(message.c == 'global') {
            io.emit("chat", {n: socket.name, m: message.m});
        }
    });

    socket.on('map_status', function (map)
    {
        clearTimeout(map_timeout[socket.user_id]);

        if(!locations[map.m])
        {
            locations[map.m] = {};
        }

        locations[map.m][socket.user_id] = map.l;

        var keys = Object.keys(locations[map.m]);
        for(var x = 0; x < keys.length; x++)
        {
            if(keys[x] == socket.user_id)
                continue;

            users[keys[x]].socket_info.emit('map_status', {i: socket.user_id, l: map.l, r: map.r, n: socket.name})
        }

        map_timeout[socket.user_id] = setTimeout(
        function()
        {
            delete locations[map.m][socket.user_id];
        }, 2000);
    });


    socket.on('apply_broadcast', function(data)
    {
        io.to(data['location']).emit('apply',
        {
            data: data['data'],
            callback : data['function'],
        });
    });

    socket.on('disconnect', function ()
    {
        if (socket.user_id)
        {
            offline_timeout[socket.user_id] = setTimeout(
            function()
            {
                delete users[socket.user_id];
            }, 15000);
        }
    });
});

function ord( string ) {
    return string.charCodeAt( 0 );
}

function decryptCookie( cookie ) {

    var cookie = JSON.parse( new Buffer( cookie, 'base64' ) );

    var iv     = new Buffer( cookie.iv, 'base64' );
    var value  = new Buffer( cookie.value, 'base64' );
    var key    = 'ABCZSbfAxfVtPtBcVozb28XlaZqPN9p8'; // laravel app key

    var rijCbc = new MCrypt( 'rijndael-128', 'cbc' );
    rijCbc.open( key, iv ); // it's very important to pass iv argument!

    var decrypted = rijCbc.decrypt( value ).toString();

    var len = decrypted.length - 1;
    var pad = ord( decrypted.charAt( len ) );

    var sessionId = PHPUnserialize.unserialize( decrypted.substr( 0, decrypted.length - pad ) );

    return sessionId;
}
