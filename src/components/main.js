import { CreateWebWorkerMLCEngine } from "https://cdn.jsdelivr.net/npm/@mlc-ai/web-llm@0.2.46/+esm";

const $ = el => document.querySelector(el);

const $chatForm = $('form');
const $messageInput = $('input');
const $messageTemplate = $('#message-template');
const $messagesList = $('ul');
const $messageContainer = $('main');
const $sendButton = $('button');
const $infoText = $('small');
const $loadingIndicator = $('.loading');

let messages = [];
let end = false;

const SELECTED_MODEL = 'RedPajama-INCITE-Chat-3B-v1-q4f16_1-MLC-1k';

const engine = await CreateWebWorkerMLCEngine(
  new Worker('src/components/worker.js', { type: 'module' }),
  SELECTED_MODEL,
  {
    initProgressCallback: (info) => {
      $infoText.textContent = info.text;
      if (info.progress === 1 && !end) {
        end = true;
        $loadingIndicator?.parentNode?.removeChild($loadingIndicator);
        $sendButton.removeAttribute('disabled');
        addMessage("¡Hola! Soy un Chat que se ejecuta completamente en tu navegador. ¿En qué puedo ayudarte hoy?", 'bot');
        $messageInput.focus();
      }
    }
  }
);

$chatForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const messageText = $messageInput.value.trim();

  if (messageText !== '') {
    $messageInput.value = '';
  }

  addMessage(messageText, 'user');
  $sendButton.setAttribute('disabled', '');

  const userMessage = {
    role: 'user',
    content: messageText
  };

  messages.push(userMessage);

  try {
    const chunks = await engine.chat.completions.create({
      messages,
      stream: true
    });

    let reply = "";

    const $botMessage = addMessage("", 'bot');

    for await (const chunk of chunks) {
      const choice = chunk.choices[0];
      const content = choice?.delta?.content ?? "";
      reply += content;
      $botMessage.textContent = reply;
    }

    $sendButton.removeAttribute('disabled');
    messages.push({
      role: 'assistant',
      content: reply
    });
    $messageContainer.scrollTop = $messageContainer.scrollHeight;
  } catch (error) {
    console.error("Error al obtener la respuesta del bot:", error);
    addMessage("Hubo un error al obtener la respuesta. Por favor, intenta nuevamente.", 'bot');
    $sendButton.removeAttribute('disabled');
  }
});

function addMessage(text, sender) {
  const clonedTemplate = $messageTemplate.content.cloneNode(true);
  const $newMessage = clonedTemplate.querySelector('.message');
  const $bubble = $newMessage.querySelector('.chat-bubble');
  const $avatar = $newMessage.querySelector('.avatar span');

  $bubble.textContent = text;
  $avatar.textContent = sender === 'bot' ? 'BOT' : 'TÚ';
  $newMessage.classList.add(sender === 'bot' ? 'chat-start' : 'chat-end');
  $bubble.classList.add(sender === 'bot' ? 'chat-bubble-primary' : 'chat-bubble-secondary');

  $messagesList.appendChild($newMessage);

  $messageContainer.scrollTop = $messageContainer.scrollHeight;

  return $bubble;
}