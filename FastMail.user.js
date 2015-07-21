// ==UserScript==
// @name        FastMail
// @namespace   com.fastmail.www
// @include     https://www.fastmail.com/*
// @version     1
// @grant       none
// ==/UserScript==
(function(win) {
  var showingHTML = false;
  var onLoadCount = -1;
  var maxOnLoadCount = 500;
  var contentDocument;
  var editor;
  
  // Check that this is the main page and not one of the iframes.
  // Don't do anything for inside the iframes.
  if (win.document.body.contentEditable !== 'inherit') {
    return;
  }
  
  // This function checks for the existence of RichText compose UI element,
  // if it's found then call the callback to perform customization.
  var onLoad = function(callback) {
    if (onLoadCount < 0) {
      onLoadCount = 0;
    }
    
    var frames = win.document.getElementsByClassName('v-RichText-input');
    if (frames.length > 0) {
      onLoadCount = -1;
      return callback(frames[0]);
    }
    
    onLoadCount++;
    
    if (onLoadCount < maxOnLoadCount) {
      setTimeout(function() {
        onLoad(callback);
      }, 10);
    }
    else {
      onLoadCount = -1;
    }
  };
  
  var getComposeDiv = function() {
    var elements = win.document.getElementsByClassName('v-Compose');
    if (elements.length > 0) {
      return elements[0];
    }
    return null;
  };
  
  var getRichTextDiv = function() {
    var elements = win.document.getElementsByClassName('v-RichText');
    if (elements.length > 0) {
      return elements[0];
    }
    return null;
  };
  
  var showHTML = function() {
    var composeDiv = getComposeDiv();
    var richText = getRichTextDiv();
    if (!composeDiv || !richText) {
      return;
    }
    
    var rect = richText.getBoundingClientRect();
    
    var label = win.document.createElement('label');
    label.setAttribute('id', 'RichTextRawHtmlLabel');
    label.setAttribute('class', 'v-Text');
    label.style.position = 'relative';
    label.style.display = 'block'
    label.style.cursor = 'text';
    label.style.minHeight = rect.height + 'px';
    
    var span = win.document.createElement('span');
    label.appendChild(span);

    var textArea = win.document.createElement('textarea');
    textArea.setAttribute('id', 'RichTextRawHtml');
    textArea.setAttribute('class', 'v-Text-input');
    textArea.style.height = rect.height + 'px';
    
    var html = contentDocument.body.innerHTML;
    html = html.replace(/<\/div>/g, '</div>\n');
    
    textArea.value = html;
    label.appendChild(textArea);
    
    composeDiv.insertBefore(label, richText);
  };
  
  var hideHTML = function() {
    var composeDiv = getComposeDiv();
    var richText = getRichTextDiv();
    if (!composeDiv || !richText) {
      return;
    }
    
    var textArea = win.document.getElementById('RichTextRawHtml');
    var innerHTML = textArea.value;
    innerHTML = innerHTML.replace(/\n/g, '');
    innerHTML = innerHTML.replace(/&lt;/g, '<');
    innerHTML = innerHTML.replace(/&gt;/g, '>');
    
    editor = new win.Squire(contentDocument);
    editor.setHTML(innerHTML);
    editor.destroy();
    composeDiv.removeChild(win.document.getElementById('RichTextRawHtmlLabel'));
  };
  
  // This function adds a link to toggle HTML mode
  var enhance = function(iframe) {
    if (!iframe) {
      return;
    }
    
    var elements = win.document.getElementsByClassName('v-Compose-addCcBcc');
    var div = elements[0];
    
    if (div.children.length > 3) {
      console.log('how does it get called multiple times?');
      return;
    }
    
    var link = win.document.createElement('a');
    link.setAttribute('class', 'u-subtleLink');
    link.setAttribute('tabindex', '-1');
    link.innerHTML = 'Toggle &lt;/&gt;';
    link.onclick = function() {
      if (!editor) {
        win.alert('editor not loaded yet');
        return;
      }
      if (showingHTML) {
        hideHTML();
      }
      else {
        showHTML();
      }
      showingHTML = !showingHTML;
    };
    div.appendChild(link);
    
    iframe.onload = function() {
      contentDocument = iframe.contentDocument;
      var body = iframe.contentDocument.body.innerHTML;
      editor = new win.Squire(contentDocument);
      editor.setHTML(body);
      editor.destroy();
    };
  };
  
  // Initial check
  onLoad(enhance);
  
  // Use MutationObserver to know when the DOM changes.
  // Whenever the DOM changes, fire off the function to repeatedly check if we're in a compose view.
  var observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.addedNodes) {
        var i, node, className;
        for (i = 0; i < mutation.addedNodes.length; i++) {
          node = mutation.addedNodes[i];
          
          className = node.getAttribute('class');
          if ((className && className.indexOf('s-discard') >= 0) ||
              node.tagName === 'iframe' ||
              node.id === 'compose') {
            
            // Avoid duplicate onLoad() running
            if (onLoadCount < 0) {
              onLoad(enhance); 
              return;
            }
          }
        }
      }
    });    
  });
  
  // configuration of the observer:
  var config = { attributes: false, childList: true, characterData: false, subtree: true };
  
  observer.observe(win.document.body, config)
})(window);
