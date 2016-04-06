/* For having a faster transition */
$(document).on("mobileinit", function () {
    $.mobile.defaultPageTransition = "none";
    $.mobile.defaultDialogTransition = "none";
    communicator.init();
});

var communicator = (function () {
    console.log('entrou');

    var obj = window.localStorage.getItem('messages');

    var savedMessages = [];
    if (obj) savedMessages = JSON.parse(obj);

    var messagesHtml = $('#messages');

    var onSendMessage = function () {
        console.log('envia mensagem');
        var message = { text: $('#message').val() };

        if (message.text == '') return;

        savedMessages.push(message);

        window.localStorage.setItem('messages', JSON.stringify(savedMessages));

        $('#message').val('');

        renderMessages(true);
    };

    var onDeleteMessages = function () {
        console.log('remove mensagem');

        window.localStorage.clear();

        savedMessages = [];
        renderMessages();
    };

    var renderMessages = function (refresh) {
        if (!savedMessages) {
            $('#message').html('<li>no messages</li>');
            return;
        }

        messagesHtml.html('');
        savedMessages.forEach(function (msg) {
            messagesHtml.append('<li>' + msg.text + '</li>');
        });

        if(refresh) messagesHtml.listview('refresh');
    };

    return {
        init: function () {
            console.log('add tap');
            $('#send-message').on("tap", onSendMessage);
            $('#delete-messages').on("tap", onDeleteMessages);
            $('#messages').listview().listview('refresh');
            renderMessages(true);
        }
    };
})();