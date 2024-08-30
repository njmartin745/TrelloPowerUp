// capacity-tracker.js

var CapacityTracker = window.CapacityTracker || {};

(function(module){
  var CAPACITY_THRESHOLD = 0.8; // 80% of 40 hours = 32 hours
  
  var onBoardButtonClick = function(t){
    return t.popup({
      title: 'Capacity Report',
      url: './report.html',
      height: 500
    });
  };

  var cardButtonCallback = function(t){
    return t.popup({
      title: 'Assign Effort',
      url: './effort.html',
      height: 300
    });
  };

  var getBadges = function(t){
    return t.card('all')
    .then(function(card){
      // Check if card is in 'New Requests' list and has effort assigned
      // This is a placeholder and needs to be implemented
      var inNewRequests = false; // Placeholder
      var hasEffort = false; // Placeholder
      
      if(inNewRequests && hasEffort){
        return [{
          text: 'Can begin on [Date]', // Placeholder date
          color: 'blue'
        }];
      } else {
        return [];
      }
    });
  };

  module.initialize = function(){
    return {
      'board-buttons': function(t, options){
        return [{
          icon: {
            dark: './images/icon-white.svg',
            light: './images/icon-black.svg'
          },
          text: 'Capacity Report',
          callback: onBoardButtonClick
        }];
      },
      'card-buttons': function(t, options){
        return [{
          icon: './images/effort-icon.svg',
          text: 'Assign Effort',
          callback: cardButtonCallback
        }];
      },
      'card-badges': function(t, card) {
        return getBadges(t);
      }
    };
  };

})(CapacityTracker);

window.TrelloPowerUp.initialize(CapacityTracker.initialize);