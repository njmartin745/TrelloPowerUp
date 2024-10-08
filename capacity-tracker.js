// capacity-tracker.js

var CapacityTracker = {
  // Constants
  HOURS_PER_WEEK: 40,
  DEFAULT_CAPACITY_THRESHOLD: 0.8, // 80%

  initialize: function() {
    return {
      'board-buttons': function(t, options) {
        return [{
          icon: {
            dark: './images/icon-white.svg',
            light: './images/icon-black.svg'
          },
          text: 'Capacity Report',
          callback: CapacityTracker.showCapacityReport
        }];
      },
      'card-buttons': function(t, options) {
        return [{
          icon: './images/effort-icon.svg',
          text: 'Assign Effort',
          callback: CapacityTracker.showEffortPopup
        }];
      },
      'card-badges': function(t, card) {
        return CapacityTracker.getCardBadges(t, card);
      },
      'card-detail-badges': function(t, card) {
        return CapacityTracker.getCardDetailBadges(t, card);
      },
      'on-enable': function(t, options) {
        return CapacityTracker.onEnable(t, options);
      },
      'show-settings': function(t, options) {
        return CapacityTracker.showSettings(t, options);
      }
    };
  },

  showCapacityReport: function(t) {
    return t.modal({
      title: 'Capacity Report',
      url: './report.html',
      height: 600,
      width: 800,
      fullscreen: false,
    });
  },

  showEffortPopup: function(t) {
    return t.popup({
      title: 'Assign Effort',
      url: './effort.html',
      height: 300
    });
  },

  getCardBadges: function(t, card) {
    return t.get('card', 'shared', 'totalEffort')
    .then(function(totalEffort) {
      if (totalEffort) {
        return [{
          text: totalEffort + ' hours',
          color: 'blue'
        }];
      } else {
        return [];
      }
    });
  },

  getCardDetailBadges: function(t, card) {
    return Promise.all([
      t.get('card', 'shared', 'totalEffort'),
      t.get('card', 'shared', 'memberEfforts')
    ])
    .then(function([totalEffort, memberEfforts]) {
      var badges = [];
      if (totalEffort) {
        badges.push({
          title: 'Total Effort',
          text: totalEffort + ' hours',
          color: 'blue'
        });
      }
      if (memberEfforts) {
        Object.entries(memberEfforts).forEach(([memberId, effort]) => {
          badges.push({
            title: 'Member Effort',
            text: `${effort} hours (${memberId})`,
            color: 'green'
          });
        });
      }
      return badges;
    });
  },

  onEnable: function(t, options) {
    return t.set('board', 'shared', 'capacityTrackerEnabled', true)
      .then(function() {
        return t.alert({
          message: 'Capacity Tracker Power-Up enabled successfully!',
          duration: 3
        });
      });
  },

  showSettings: function(t, options) {
    return t.popup({
      title: 'Capacity Tracker Settings',
      url: './settings.html',
      height: 300
    });
  },

  calculateMemberCapacity: function(t, memberId) {
    return Promise.all([
      t.board('members'),
      t.cards('all')
    ])
    .then(function([board, cards]) {
      var member = board.members.find(m => m.id === memberId);
      if (!member) {
        throw new Error('Member not found');
      }

      var workload = 0;
      cards.forEach(function(card) {
        if (card.memberEfforts && card.memberEfforts[memberId]) {
          workload += card.memberEfforts[memberId];
        }
      });

      return {
        id: member.id,
        name: member.fullName,
        workload: workload,
        capacity: CapacityTracker.HOURS_PER_WEEK,
        availableCapacity: Math.max(0, CapacityTracker.HOURS_PER_WEEK - workload)
      };
    });
  },

  calculateMemberWorkload: function(t) {
    return Promise.all([
      t.board('members'),
      t.cards('all')
    ])
    .then(function([board, cards]) {
      var memberWorkloads = {};
      board.members.forEach(function(member) {
        memberWorkloads[member.id] = {
          id: member.id,
          name: member.fullName,
          workload: 0,
          capacity: CapacityTracker.HOURS_PER_WEEK,
          availableCapacity: CapacityTracker.HOURS_PER_WEEK
        };
      });

      cards.forEach(function(card) {
        if (card.memberEfforts) {
          Object.entries(card.memberEfforts).forEach(([memberId, effort]) => {
            if (memberWorkloads[memberId]) {
              memberWorkloads[memberId].workload += effort;
              memberWorkloads[memberId].availableCapacity = Math.max(0, CapacityTracker.HOURS_PER_WEEK - memberWorkloads[memberId].workload);
            }
          });
        }
      });

      return Object.values(memberWorkloads);
    });
  },

  getWeekNumber: function(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  },

  findAvailableMember: function(members, cards, effort) {
    const currentWeek = CapacityTracker.getWeekNumber(new Date());
    const memberWorkloads = members.map(member => ({
      id: member.id,
      name: member.fullName,
      workload: CapacityTracker.getMemberWorkload(member, cards, currentWeek)
    }));

    memberWorkloads.sort((a, b) => a.workload - b.workload);

    for (let member of memberWorkloads) {
      if (member.workload + effort <= CapacityTracker.HOURS_PER_WEEK * CapacityTracker.DEFAULT_CAPACITY_THRESHOLD) {
        return member;
      }
    }

    return null; // No available member found
  },

  getMemberWorkload: function(member, cards, weekNum) {
    return cards.filter(card => 
      card.idMembers.includes(member.id) && 
      CapacityTracker.getWeekNumber(new Date(card.due)) === weekNum
    ).reduce((total, card) => total + (card.effort || 0), 0);
  },

  calculateEarliestStartDate: function(member, cards, effort) {
    let currentWeek = CapacityTracker.getWeekNumber(new Date());
    let workload = CapacityTracker.getMemberWorkload(member, cards, currentWeek);

    while (workload + effort > CapacityTracker.HOURS_PER_WEEK * CapacityTracker.DEFAULT_CAPACITY_THRESHOLD) {
      currentWeek++;
      workload = CapacityTracker.getMemberWorkload(member, cards, currentWeek);
    }

    // Convert week number back to a date (Monday of that week)
    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear, 0, 1 + (currentWeek - 1) * 7);
    startDate.setDate(startDate.getDate() + (1 - startDate.getDay())); // Adjust to Monday

    return startDate;
  },

  updateForecastForCard: function(t, cardId) {
    return Promise.all([
      t.board('members'),
      t.card('all'),
      t.cards('all')
    ]).then(function([board, card, allCards]) {
      const effort = card.effort || 0;
      let availableMember = board.members.find(m => card.idMembers.includes(m.id));

      if (!availableMember) {
        availableMember = CapacityTracker.findAvailableMember(board.members, allCards, effort);
      }

      if (availableMember) {
        const startDate = CapacityTracker.calculateEarliestStartDate(availableMember, allCards, effort);
        const badgeText = `Can begin on ${startDate.toLocaleDateString()}`;
        return t.set(card.id, 'shared', 'startDate', startDate.toISOString())
          .then(() => CapacityTracker.getCardBadges(t, card));
      } else {
        return CapacityTracker.getCardBadges(t, card);
      }
    });
  }
};