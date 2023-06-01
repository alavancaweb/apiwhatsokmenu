// BACKEND DA API
// BIBLIOTECAS UTILIZADAS PARA COMPOSIÇÃO DA API
const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const { body, validationResult } = require('express-validator');
const socketIO = require('socket.io');
const qrcode = require('qrcode');
const http = require('http');
const fs = require('fs');
const dirQrCode = './qrcode';
const fileUpload = require('express-fileupload');
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// PORTA ONDE O SERVIÇO SERÁ INICIADO
const port = 8009;
const idClient = 'bot-delivery';

const filePath = 'dados.json';

const data = {
  status: '1'
};

const dataDesc = {
  status: '2'
};

const jsonData = JSON.stringify(data);
const jsonDataDesconect = JSON.stringify(dataDesc);

// SERVIÇO EXPRESS
app.use(express.json());
app.use(express.urlencoded({
extended: true
}));
app.use(fileUpload({
debug: true
}));
app.use("/", express.static(__dirname + "/"))

app.get('/', (req, res) => {
  res.sendFile('index.html', {
    root: __dirname
  });
});


// PARÂMETROS DO CLIENT DO WPP
const client = new Client({
  authStrategy: new LocalAuth({ clientId: idClient }),
  puppeteer: { headless: true,
    // CAMINHO DO CHROME PARA WINDOWS (REMOVER O COMENTÁRIO ABAIXO)
    //executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    //===================================================================================
    // CAMINHO DO CHROME PARA MAC (REMOVER O COMENTÁRIO ABAIXO)
    //executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    //===================================================================================
    // CAMINHO DO CHROME PARA LINUX (REMOVER O COMENTÁRIO ABAIXO)
    //executablePath: '/usr/bin/google-chrome-stable',
    //===================================================================================
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process', // <- this one doesn't works in Windows
      '--disable-gpu'
    ] }
});

// INITIALIZE DO CLIENT DO WPP
client.initialize();

// EVENTOS DE CONEXÃO EXPORTADOS PARA O INDEX.HTML VIA SOCKET
io.on('connection', function(socket) { 

  fs.readFile(filePath, 'utf8', (err, data) => {      
  
    // Os dados do arquivo JSON estão armazenados em 'data'
    const jsonData = JSON.parse(data);

    if(jsonData.status == "1"){
      socket.emit('init', './check.svg');     
    }else{
      socket.emit('init', './imagem.gif'); 
    }      
  });    
  
  client.on('qr', async(qr) => {

    fs.readFile(filePath, 'utf8', (err, data) => {      
  
      // Os dados do arquivo JSON estão armazenados em 'data'
      const jsonData = JSON.parse(data);
  
      if(jsonData.status == "1"){
        socket.emit('qr', './check.svg');      
      }else{
        qrcode.toDataURL(qr, (err, url) => {
          socket.emit('qr', url);
        });
      }      
    });    
  });

  client.on('ready', () => {
    socket.emit('qr', './check.svg')	

    fs.writeFile(filePath, jsonData, (err) => {
    });
  });

  client.on('authenticated', () => {
    socket.emit('authenticated', 'Autenticado!');
  });

  client.on('auth_failure', function() {
    socket.emit('message', 'Falha na autenticação, reiniciando...');
  });

  client.on('change_state', state => {
  console.log('Status de conexão: ', state );
  });

  client.on('disconnected', (reason) => {
    fs.writeFile(filePath, jsonDataDesconect, (err) => {
    });
    client.destroy();
    client.initialize();
  });
});

// POST PARA ENVIO DE MENSAGEM
app.post('/send-message', [
  body('number').notEmpty(),
  body('message').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req).formatWith(({
    msg
  }) => {
    return msg;
  });

  if (!errors.isEmpty()) {
    return res.status(422).json({
      status: false,
      message: errors.mapped()
    });
  }

  const number = req.body.number.replace(/\D/g,'');
  const numberDDD = number.substr(0, 2);
  const numberUser = number.substr(-8, 8);
  const message = req.body.message;

  if (numberDDD <= 30) {
    const numberZDG = "55" + numberDDD + "9" + numberUser + "@c.us";
    client.sendMessage(numberZDG, message).then(response => {
    res.status(200).json({
      status: true,
      message: 'Mensagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'Mensagem não enviada',
      response: err.text
    });
    });
  }
  else if (numberDDD > 30) {
    const numberZDG = "55" + numberDDD + numberUser + "@c.us";
    client.sendMessage(numberZDG, message).then(response => {
    res.status(200).json({
      status: true,
      message: 'Mensagem enviada',
      response: response
    });
    }).catch(err => {
    res.status(500).json({
      status: false,
      message: 'Mensagem não enviada',
      response: err.text
    });
    });
  }
});

// EVENTO DE ESCUTA/ENVIO DE MENSAGENS RECEBIDAS PELA API
client.on('message', async msg => {

if (msg.body !== null || msg.body === "0" || msg.type !== 'ciphertext') {
    msg.reply("😁 Olá, tudo bem? Como vai você? Segue nosso cardapio virtual suaempresa.okmenu.com.br");
	}
});
    
// INITIALIZE DO SERVIÇO
server.listen(port, function() {
  console.log('Aplicativo rodando na porta *: ' + port);
});
