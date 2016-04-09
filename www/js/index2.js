/* For having a faster transition */
$(document).on("mobileinit", function () {
    $.mobile.defaultPageTransition = "none";
    $.mobile.defaultDialogTransition = "none";
    usersListPage.init();
    communicator.init();
    accelerometer.init();
});

var communicator = (function () {
    var savedMessages = [];
    var messageHtml = $("#message");
    var messagesListHtml = $("#messages");

    var onSendMessage = function () {
        saveMessage(messageHtml.val(), "text");
        renderMessages("refresh");
        messageHtml.val("");
    }

    var onDeleteMessages = function () {
        localStorage.clear();
        savedMessages = [];
        renderMessages("refresh");
        messageHtml.val("");
    }

    var renderMessages = function (refresh) {
        messagesListHtml.html("");
        if (savedMessages.length <= 0) {
            //"<li>No messages</li>"
            createListItem("No messages");
        } else {
            savedMessages.forEach(function (data) {
                if (data.type === "image64") {
                    //<li><img src='data:image/png;base64, " + data.value + "'></img></li>"
                    createListItem("data:image/png;base64, " + data.value, true);
                } else {
                    //"<li>" + data.value + "</li>"
                    createListItem(data.value, false);
                }
            });
        }
        messagesListHtml.listview(refresh)
    }

    var createListItem = function (value, isImg) {
        var clonedLi = null;
        if (isImg) {
            clonedLi = $("li[data-template-message-img='true']").clone().removeAttr("data-template-message-img").appendTo(messagesListHtml);
            clonedLi.child()[0].attr("src", value);
        } else {
            clonedLi = $("li[data-template-message-text='true']").clone().removeAttr("data-template-message-text").appendTo(messagesListHtml);
            clonedLi.html(value);
        }
        return clonedLi;
    }

    var onGetPhoto = function () {
        var options = {
            sourceType: Camera.PictureSourceType.PHOTOLIBRARY,
            destinationType: Camera.DestinationType.DATA_URL
            //sourceType: Camera.PictureSourceType.CAMERA,
            //destinationType: Camera.DestinationType.FILE_URI
        }

        navigator.camera.getPicture(onGetPhotoSuccess, onGetPhotoError, options);
    }

    var onGetPhotoSuccess = function (imageData) {
        saveMessage(imageData, "image64");
        renderMessages("refresh");
        messageHtml.val("");
    }

    var onGetPhotoError = function (messageError) {
        console.log(messageError);
    }

    var saveMessage = function (data, type) {
        savedMessages.push({ value: data, type: type });
        localStorage.setItem("messages", JSON.stringify(savedMessages));
    }

    var loadMessages = function () {
        if (localStorage.getItem("messages")) {
            JSON.parse(localStorage.getItem("messages")).forEach(function (data) {
                savedMessages.push({ value: data.value, type: data.type });
            });
            renderMessages();
        }
    }

    return {
        init: function () {
            $("#send-message").on("tap", onSendMessage);
            $("#delete-messages").on("tap", onDeleteMessages);
            $("#get-photo").on("taphold", onGetPhoto);
            loadMessages();
        }
    }
})();

var accelerometer = (function () {
    var transforms = ["-webkit-transform", "-moz-transform", "-ms-transform", "transform"];

    var accelerometerSuccess = function (data) {
        var rotate = {};
        transforms.forEach(function (attr) {
            var rotateX = 'rotateX(' + (data.x * 100) + 'deg)';
            var rotateY = 'rotateY(' + (data.y * 100) + 'deg)';
            var rotateZ = 'rotateZ(' + (data.z * 100) + 'deg)';

            rotate[attr] = rotateX + rotateY + rotateZ;
        });

        $("#box-phone-d1").css(rotate)
    }

    var accelerometerError = function (messageError) {
        console.log(messageError);
    }

    return {
        init: function () {
            var options = { frequency: 2000 };
            navigator.accelerometer.watchAcceleration(accelerometerSuccess, accelerometerError, options);
        }
    }
})();

var usersListPage = (function () {
    var listUsers = $("#users");

    var onGetUserListSuccess = function (data) {
        listUsers.html("");
        if (data && data.length <= 0) {
            createListItem("No users", false);
        } else {
            data.forEach(function (user) {
                //"<li>" + user.user + " - " + user.pass + "</li>"
                createListItem(user, true);
            });
        }
        listUsers.listview("refresh");
    }

    var createListItem = function (value, isUsers) {
        var clonedLi = $("li[data-template-user='true']").clone().removeAttr("ata-template-user").appendTo(listUsers);
        if (isUsers) {
            var childrens = clonedLi.children();
        } else {
            clonedLi.html(value);
        }
    }

    var getUserList = function () {
        $.ajax({
            dataType: 'jsonp',
            jsonpCallback: 'jsonCallback',
            contentType: 'application/json',
            url: 'http://www.mocky.io/v2/56f0a2ef1000007f018ef257',
            success: onGetUserListSuccess
        });
    }

    return {
        myKey: 'k',
        init: function () {
            getUserList();
        }
    }
})();