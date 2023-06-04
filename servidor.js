var http = require("http");
var url = require("url");
var fs = require("fs");
var path = require("path");
var socketio = require("socket.io");

var MongoClient = require('mongodb').MongoClient;
var MongoServer = require('mongodb').Server;
var mimeTypes = { "html": "text/html", "jpeg": "image/jpeg", "jpg": "image/jpeg", 
                  "png": "image/png", "js": "text/javascript", "css": "text/css",
                  "swf": "application/x-shockwave-flash"};

var httpServer = http.createServer(
	function(request, response) {
		var uri = url.parse(request.url).pathname;
		if (uri=="/") uri = "/sistema-domotico.html";
		var fname = path.join(process.cwd(), uri);
		fs.exists(fname, function(exists) {
			if (exists) {
				fs.readFile(fname, function(err, data){
					if (!err) {
						var extension = path.extname(fname).split(".")[1];
						var mimeType = mimeTypes[extension];
						response.writeHead(200, mimeType);
						response.write(data);
						response.end();
					} else {
						response.writeHead(200, {"Content-Type": "text/plain"});
						response.write('Error de lectura en el fichero: '+uri);
						response.end();
					}
				});
			} else {
				console.log("Petición inválida: "+uri);
				response.writeHead(200, {"Content-Type": "text/plain"});
				response.write('404 Not Found\n');
				response.end();
			}
		});
	}
);



MongoClient.connect("mongodb://localhost:27017/", { useUnifiedTopology: true }, function(err, db) {
	httpServer.listen(8080);
	var io = socketio(httpServer);
    console.log("Conectado a la base de datos.");
    let VentanaAbierta = false, AireOn = false;
    var iluminacion = 50; temperatura = 29;

	var dbo = db.db("domotica");

    var collection = dbo.collection("valores");

    io.sockets.on('connection',
    function(client) {
        client.on('sensores', function (data) {
            var datosActualizados = { descripcion: "Modificando sensores... ", ilum: data.ilum, temp: data.temp, fecha: new Date() };

            collection.insertOne(datosActualizados).then(function(result) {});

            temperatura = data.temp;
            iluminacion = data.ilum;
            console.log("Iluminación: " + data.ilum + "%, Temperatura: " + temperatura + "º");

            client.emit('actualidad_sensores', {
                ilum: iluminacion,
                temp: temperatura
            });

            Agente(iluminacion, temperatura, client, AireOn, VentanaAbierta);

            collection.find().toArray().then(function(items) {
                client.emit('historico', items);
            });
        });

        collection.find().toArray().then(function(items) {
            client.emit('historico', items);
        });

        client.emit('actualidad_sensores', {
            ilum: iluminacion,
            temp: temperatura
        });

        Agente(iluminacion, temperatura, client, AireOn, VentanaAbierta);
    });
});

function Agente(ilum, temp, client, AireOn, VentanaAbierta) {
    if (temp > 35 && !AireOn) {
        AireOn = true;
        client.emit('alerta', { peligroTemp: true,
             peligroIlum: false,
             mensajeTemp: "Agente: ¡LA TEMPERATURA ES DEMASIADO ALTA!",
             mensajeIlum: "No hay peligro." 
        });
    } else if (temp <= 27 && AireOn) {
        AireOn = false;
        client.emit('alerta', { peligroTemp: false,
             peligroIlum: false,
             mensajeTemp: "No hay peligro.",
             mensajeIlum: "No hay peligro." 
        });
    } else if (ilum < 20 && !VentanaAbierta) {
        VentanaAbierta = true;
        client.emit('alerta', { peligroTemp: false,
             peligroIlum: true,
             mensajeIlum: "Agente: ¡LA ILUMINACIÓN ES DEMASIADO BAJA!",
             mensajeTemp: "No hay peligro." 
        });
    } else if (ilum >= 70 && VentanaAbierta) {
        VentanaAbierta = false;
        client.emit('alerta', { peligroTemp: false,
             peligroIlum: false,
             mensajeIlum: "No hay peligro.",
             mensajeTemp: "No hay peligro."
        });
    } else if (ilum < 20 && temp > 35) {
        AireOn = true;
        client.emit('alerta', { peligroTemp: true,
             peligroIlum: true,
             mensajeTemp: "Agente: TEMPERATURA: ¡PELIGRO EXTREMO!",
             mensajeIlum: "Agente: ILUMINACIÓN: ¡PELIGRO EXTREMO!" });
    } else {
        client.emit('alerta', { peligroTemp: false,
             peligroIlum: false,
             mensajeTemp: "No hay peligro.",
             mensajeIlum: "No hay peligro." 
        });
    }
}

console.log("Servidor inicializado.");