// trello-api.js

var CapacityTracker = window.CapacityTracker || {};

(function(module) {
  var API_KEY = '9da7e92ca72cceac6cad67ff039b9a8d'; // This should be securely stored and retrieved
  
  function getAuthToken(t) {
    return t.get('member', 'private', 'authToken')
      .then(function(authToken) {
        if (authToken) {
          return authToken;
        } else {
          return t.popup({
            title: 'Authorize Capacity Tracker',
            url: './authorize.html',
            height: 140,
          });
        }
      });
  }

  module.getBoardMembers = function(t) {
    return getAuthToken(t)
      .then(function(token) {
        return fetch(
          `https://api.trello.com/1/board/${t.getContext().board}/members?key=${API_KEY}&token=${token}`
        ).then(response => response.json());
      });
  };

  module.getCardData = function(t, cardId) {
    return getAuthToken(t)
      .then(function(token) {
        return fetch(
          `https://api.trello.com/1/cards/${cardId}?key=${API_KEY}&token=${token}`
        ).then(response => response.json());
      });
  };

  module.updateCardBadge = function(t, cardId, badgeText) {
    return getAuthToken(t)
      .then(function(token) {
        return fetch(
          `https://api.trello.com/1/cards/${cardId}/badges?key=${API_KEY}&token=${token}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              text: badgeText,
            }),
          }
        ).then(response => response.json());
      });
  };

  module.getLists = function(t) {
    return getAuthToken(t)
      .then(function(token) {
        return fetch(
          `https://api.trello.com/1/boards/${t.getContext().board}/lists?key=${API_KEY}&token=${token}`
        ).then(response => response.json());
      });
  };

})(CapacityTracker);