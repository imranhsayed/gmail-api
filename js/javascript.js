var clientId = '';
var apiKey = '';
var scopes =
	'https://www.googleapis.com/auth/gmail.readonly '+
	'https://www.googleapis.com/auth/gmail.send';

function handleClientLoad() {
	gapi.client.setApiKey(apiKey);
	window.setTimeout(checkAuth, 1);
}

function checkAuth() {
	gapi.auth.authorize({
		client_id: clientId,
		scope: scopes,
		immediate: true
	}, handleAuthResult);
}

function handleAuthClick() {
	gapi.auth.authorize({
		client_id: clientId,
		scope: scopes,
		immediate: false
	}, handleAuthResult);
	return false;
}

function handleAuthResult(authResult) {
	if(authResult && !authResult.error) {
		loadGmailApi();
		$('#authorize-button').remove();
		$('.table-inbox').removeClass("hidden");
		$('#compose-button').removeClass("hidden");
	} else {
		$('#authorize-button').removeClass("hidden");
		$('#authorize-button').on('click', function(){
			handleAuthClick();
		});
	}
}

function loadGmailApi() {
	gapi.client.load('gmail', 'v1', displayInbox);
}

function displayInbox() {
	var request = gapi.client.gmail.users.messages.list({
		'userId': 'me',
		'labelIds': 'INBOX',
		'maxResults': 5
	});
	request.execute(function(response) {
		$.each(response.messages, function() {
			var messageRequest = gapi.client.gmail.users.messages.get({
				'userId': 'me',
				'id': this.id
			});
			messageRequest.execute(appendMessageRow);
		});
	});
}

function appendMessageRow(message) {
	$('.table-inbox tbody').append(
		'<tr>\
		  <td>'+getHeader(message.payload.headers, 'From')+'</td>\
            <td>\
              <a href="#message-modal-' + message.id +
		'" data-toggle="modal" id="message-link-' + message.id+'">' +
		getHeader(message.payload.headers, 'Subject') +
		'</a>\
	  </td>\
	  <td>'+getHeader(message.payload.headers, 'Date')+'</td>\
          </tr>'
	);
	var reply_to = (getHeader(message.payload.headers, 'Reply-to') !== '' ?
		getHeader(message.payload.headers, 'Reply-to') :
		getHeader(message.payload.headers, 'From')).replace(/\"/g, '&quot;');

	var reply_subject = 'Re: '+getHeader(message.payload.headers, 'Subject').replace(/\"/g, '&quot;');
	$('body').append(
		'<div class="modal fade" id="message-modal-' + message.id +
		'" tabindex="-1" role="dialog" aria-labelledby="myModalLabel">\
	  <div class="modal-dialog modal-lg">\
		<div class="modal-content">\
		  <div class="modal-header">\
			<button type="button"\
					class="close"\
					data-dismiss="modal"\
					aria-label="Close">\
			  <span aria-hidden="true">&times;</span></button>\
			<h4 class="modal-title" id="myModalLabel">' +
		getHeader(message.payload.headers, 'Subject') +
		'</h4>\
	  </div>\
	  <div class="modal-body">\
		<iframe id="message-iframe-'+message.id+'" srcdoc="<p>Loading...</p>">\
                  </iframe>\
                </div>\
                <div class="modal-footer">\
                  <button type="button" class="btn btn-default" data-dismiss="modal">Close</button>\
                  <button type="button" class="btn btn-primary reply-button" data-dismiss="modal" data-toggle="modal" data-target="#reply-modal"\
                  onclick="fillInReply(\
                    \''+reply_to+'\', \
                    \''+reply_subject+'\', \
                    \''+getHeader(message.payload.headers, 'Message-ID')+'\'\
                    );"\
                  >Reply</button>\
                </div>\
              </div>\
            </div>\
          </div>'
	);
	$('#message-link-'+message.id).on('click', function(){
		var ifrm = $('#message-iframe-'+message.id)[0].contentWindow.document;
		$('body', ifrm).html(getBody(message.payload));
	});
}

function sendEmail()
{
	$('#send-button').addClass('disabled');

	sendMessage(
		{
			'To': $('#compose-to').val(),
			'Subject': $('#compose-subject').val()
		},
		$('#compose-message').val(),
		composeTidy
	);

	return false;
}

function composeTidy()
{
	$('#compose-modal').modal('hide');

	$('#compose-to').val('');
	$('#compose-subject').val('');
	$('#compose-message').val('');

	$('#send-button').removeClass('disabled');
}

function sendReply()
{
	$('#reply-button').addClass('disabled');

	sendMessage(
		{
			'To': $('#reply-to').val(),
			'Subject': $('#reply-subject').val(),
			'In-Reply-To': $('#reply-message-id').val()
		},
		$('#reply-message').val(),
		replyTidy
	);
	console.log( $('#reply-to').val() );

	return false;
}

function replyTidy()
{
	$('#reply-modal').modal('hide');

	$('#reply-message').val('');

	$('#reply-button').removeClass('disabled');
}

function fillInReply(to, subject, message_id)
{
	$('#reply-to').val(to);
	$('#reply-subject').val(subject);
	$('#reply-message-id').val(message_id);
}

function sendMessage(headers_obj, message, callback)
{
	var email = '';

	for(var header in headers_obj)
		email += header += ": "+headers_obj[header]+"\r\n";

	email += "\r\n" + message;

	var sendRequest = gapi.client.gmail.users.messages.send({
		'userId': 'me',
		'resource': {
			'raw': window.btoa(email).replace(/\+/g, '-').replace(/\//g, '_')
		}
	});

	return sendRequest.execute(callback);
}

function getHeader(headers, index) {
	var header = '';
	$.each(headers, function(){
		if(this.name.toLowerCase() === index.toLowerCase()){
			header = this.value;
		}
	});
	return header;
}

function getBody(message) {
	var encodedBody = '';
	if(typeof message.parts === 'undefined')
	{
		encodedBody = message.body.data;
	}
	else
	{
		encodedBody = getHTMLPart(message.parts);
	}
	encodedBody = encodedBody.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '');
	return decodeURIComponent(escape(window.atob(encodedBody)));
}

function getHTMLPart(arr) {
	for(var x = 0; x <= arr.length; x++)
	{
		if(typeof arr[x].parts === 'undefined')
		{
			if(arr[x].mimeType === 'text/html')
			{
				return arr[x].body.data;
			}
		}
		else
		{
			return getHTMLPart(arr[x].parts);
		}
	}
	return '';
}