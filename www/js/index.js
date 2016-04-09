/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    //add listener to mobileinit event
    bindEvents: function() {
        $(document).on("mobileinit", this.onMobileInit);
    },
    // Update DOM on a Received Event
    onMobileInit: function() {
        $.mobile.defaultPageTransition = "none";
        $.mobile.defaultDialogTransition = "none";

        //inicia o acelerômetro
        accelerometer.init();
        //obtem dados de usuario
        userListPage.init();
        socketClient.init();
    }
};

var html = {
    li: function(txt){
        return "<li>" + txt + "</li>";
    },
    img: function(src, alt, cls, clsContainer){
        return "<div class='" + clsContainer + "'><img alt='" + alt + "' src='" + src + "' class='" + cls + "' /></div>";
    },

}

var accelerometer = (function(){

    var transforms = ['-webkit-transform', '-moz-transform', '-ms-transform', 'transform'];

    var movePhoneIcon = function(data, user){
        var rotate = {};
        transforms.forEach(function(attr){

            var rotateX = 'rotateX(' + (data.x*100) + 'deg)';
            var rotateY = 'rotateY(' + (data.y*100) + 'deg)';
            var rotateZ = 'rotateZ(' + (data.z*100) + 'deg)';

            rotate[attr] =  rotateX + rotateY + rotateZ;
        })

        $('#box-phone-' + user).css(rotate);
    } 

    var accelerometerSuccess = function(data){

        var from = $('#user-logged').val();
        movePhoneIcon(data, from);
        socketClient.sendMessage(
            '{"from":"'+ from
            + '", "x": ' + data.x 
            + ', "y": ' + data.y 
            + ', "z": ' + data.z + ', "type": "accelerometer" }');
    }

    var accelerometerError = function(err){
        console.log('could not access acelerator ' + err);
    }    

    return {
        init: function(){
            var options = {frequency : 2000};
            navigator.accelerometer
                .watchAcceleration(
                    accelerometerSuccess, 
                    accelerometerError, 
                    options);
        },
        moveOtherUserPhone: function(data, user){
            movePhoneIcon(data, user);
        }
    };
})();

var socketClient = (function(){

    var socket = null;
    var connected = false;

    var onSocketError = function(error) {
        console.log('WebSocket Error: ' + error);
    };

    var onSocketOpen = function(event) {
        console.log('Connected to: ws://echo.websocket.org');
        connected = true;
    };

    var onSocketMessage = function(event) {
        var data = JSON.parse(event.data);

        if(data.type === 'accelerometer')
            accelerometer.moveOtherUserPhone(data, data.from);
        else if(data.to === communicator.getFrom())
            communicator.receiveMessage(data.type, data.message, data.from);

        console.log('Received: ' + event.data);
    };

    var onSocketClose = function(event) {
        console.log('Disconnected');
    };

    return {
        init: function(){
            if(!connected){
                socket = new WebSocket('ws://127.0.0.1:1337');
                socket.onmessage = onSocketMessage;
                socket.onerror = onSocketError;
                socket.onopen = onSocketOpen;
                socket.onclose = onSocketClose;
            }
        },
        sendMessage : function(message){
            if(socket && connected)
                socket.send(message);
        },
        close: function(){
            socket.close();
        }      
    };

})();


var userListPage = (function(){
    var myKey = 'a';
    var usersList = [];

    var onGetUserListSuccess = function(data){
        usersList = data;
        var usersHtml = $('#users');

        usersList.forEach(function(u){
            var item = html.li('<a class="conversations" data-user="' + u.user + '"><div class="square"><img id="box-phone-' 
                + u.user + '" src="img/phone.png" /></div>&nbsp;Dupla ' 
                + u.user + '</a>');

            usersHtml.append(item);
        });

        usersHtml.listview('refresh');
        bindPageNavigationEvent();
    }

    var pageChangeClick = function(){
        $.mobile.pageContainer.pagecontainer("change", "#page", {
            user: $(this).attr("data-user"),
            transition: "flip"
        });        
    }

    var onPageBeforeChange = function (e, data) {
        if (data.toPage === "#page") {
            var user = data.options.user;
            communicator.init(user);
        }
    };

    var onNavigate = function (event, data) {
      var direction = data.state.direction;
      if (direction == 'back') {
        console.log('back clicked');
      }
    };

    var bindPageNavigationEvent = function(){
        $('.conversations').click(pageChangeClick);
        $(document).on("pagebeforechange", onPageBeforeChange);      

        $(window).on("navigate", onNavigate);
    }

    var getUserList = function(){

        $.ajax({
          dataType: 'jsonp',
          jsonpCallback: 'jsonCallback',
          contentType: 'application/json',
          url: 'http://www.mocky.io/v2/56f0a2ef1000007f018ef257',
          success: onGetUserListSuccess
        });

    }

    return {
        myKey : 'a',
        init : function(){
            getUserList();
        }
    }

})();

var communicator = (function(){
    //objeto em memoria que armazena as mensagens salvas
    var savedMessages = [];
    //armazena o usuario destino da conversa
    var to = '';
    var from = '';
    //referência à chave de mensagens
    var messagesListKey = '';
    //referencia a listview
    var messagesHtml = $('#messages');
    //determines if this is the not first time this communicator is initialized
    var refresh = false;

    var storeMessage = function(type, val, user){
        var message = {value: val, type: type, user: user};
        //inclui na lista de mensagens salvas
        savedMessages.push(message);
        //persiste na localStorage
        window.localStorage.setItem(messagesListKey, JSON.stringify(savedMessages));
    }

    var onGetPhoto = function(){

        var options = { 
                sourceType : Camera.PictureSourceType.PHOTOLIBRARY, 
                destinationType : Camera.DestinationType.DATA_URL            
            //    sourceType : Camera.PictureSourceType.CAMERA, 
            //    destinationType : Camera.DestinationType.DATA_URL 
            };

        navigator.camera.getPicture(onGetPhotoSuccess, onGetPhotoError, options);
    }

    var onGetPhotoSuccess = function(imageData){        
        storeMessage('image64', imageData, from);
        renderMessages();
    }

    var onGetPhotoError = function(err){
        console.log('could not access photos ' + err);
    }    

    var onSendMessage = function() {
        storeMessage('text', $('#message').val(), from);
        //envia mensagem para outros clientes
        socketClient.sendMessage('{"from":"'+ from + '", "to":"' + to + '", "message": "' + $('#message').val() + '", "type": "text" }');        
        //limpa o textarea
        $('#message').val('');
        //atualiza a lista no html
        renderMessages();
    };

    var onDeleteMessages = function(){
        //apaga todas as mensagens da localStorage
        window.localStorage.clear();
        //limpa do objeto em memoria
        savedMessages = [];
        renderMessages();
    }

    var renderMessages = function(){
        //se nao houver nenhuma mensagem renderiza 'no messages'
        if(savedMessages === []){
            $('#messages').html(html.li('no messages')); return;
        }

        //apaga o que foi gravado anteriormente na listview
        messagesHtml.html('');
        //itera sobre a lista de mensagens salvas
        savedMessages.forEach(function(msg){
            //cria um li para cada item da lista de mensagens
            var fromTxt = 'from ' + msg.user + ': ';
            if(msg.type === 'text') {messagesHtml.append(html.li(fromTxt + msg.value));}
            if(msg.type === 'image64'){
                var src = "data:image/jpeg;base64," + msg.value;
                messagesHtml.append(html.li(fromTxt + html.img(src, 'image','img-thumb', 'img-container')));
            }
            //caso já exista uma listview criada, executa o comando de refresh
            // para aplicar o estilo novamente apos recriar a lista
            if(refresh) messagesHtml.listview('refresh');
        });
    }

    return {
        init: function(user){
            savedMessages = [];
            to = user;
            from = $('#user-logged').val();
            messagesListKey = 'messages_' + to + '_' + from;
            //busca as mensagens salvas em localStorage
            var messages = window.localStorage.getItem(messagesListKey);
            //converte as mensagens de string para array javascript
            if(messages) savedMessages = JSON.parse(messages);
            //rendiza as mensagens do array de savedMessages
            renderMessages();
            //registra os eventos de touch no botao de send-message e delete-messages
            if(!refresh){
                $('#send-message').on("tap", onSendMessage);            
                $('#delete-messages').on("tap", onDeleteMessages);
                $('#get-photo').on("taphold", onGetPhoto);
            }
            refresh = true;
        },
        getFrom: function (){
            return from;
        },
        receiveMessage: function(type, message, user){
            storeMessage(type, message, user);
            //limpa o textarea
            $('#message').val('');
            //atualiza a lista no html
            renderMessages();            
        }
    };

})();

app.initialize();