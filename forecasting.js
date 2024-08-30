// forecasting.js

var CapacityTracker = window.CapacityTracker || {};

(function(module) {
  const HOURS_PER_WEEK = 40;
  const DEFAULT_CAPACITY_THRESHOLD = 0.8; // 80%

  function getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
    return Math.ceil((((d - yearStart) / 86400000) + 1)/7);
  }

  function getMemberWorkload(member, cards, weekNum) {
    return cards.filter(card => 
      card.idMembers.includes(member.id) && 
      getWeekNumber(new Date(card.due)) === weekNum
    ).reduce((total, card) => total + (card.effort || 0), 0);
  }

  module.findAvailableMember = function(members, cards, effort) {
    const currentWeek = getWeekNumber(new Date());
    const memberWorkloads = members.map(member => ({
      id: member.id,
      name: member.fullName,
      workload: getMemberWorkload(member, cards, currentWeek)
    }));

    memberWorkloads.sort((a, b) => a.workload - b.workload);

    for (let member of memberWorkloads) {
      if (member.workload + effort <= HOURS_PER_WEEK * DEFAULT_CAPACITY_THRESHOLD) {
        return member;
      }
    }

    return null; // No available member found
  };

  module.calculateEarliestStartDate = function(member, cards, effort) {
    let currentWeek = getWeekNumber(new Date());
    let workload = getMemberWorkload(member, cards, currentWeek);

    while (workload + effort > HOURS_PER_WEEK * DEFAULT_CAPACITY_THRESHOLD) {
      currentWeek++;
      workload = getMemberWorkload(member, cards, currentWeek);
    }

    // Convert week number back to a date (Monday of that week)
    const currentYear = new Date().getFullYear();
    const startDate = new Date(currentYear, 0, 1 + (currentWeek - 1) * 7);
    startDate.setDate(startDate.getDate() + (1 - startDate.getDay())); // Adjust to Monday

    return startDate;
  };

  module.updateForecastForCard = function(t, cardId) {
    return Promise.all([
      CapacityTracker.trelloAPI.getBoardMembers(t),
      CapacityTracker.trelloAPI.getCardData(t, cardId),
      t.cards('all') // Get all cards on the board
    ]).then(([members, card, allCards]) => {
      const effort = card.effort || 0; // Assuming effort is stored on the card
      let availableMember = members.find(m => card.idMembers.includes(m.id));

      if (!availableMember) {
        availableMember = module.findAvailableMember(members, allCards, effort);
      }

      if (availableMember) {
        const startDate = module.calculateEarliestStartDate(availableMember, allCards, effort);
        const badgeText = `Can begin on ${startDate.toLocaleDateString()}`;
        return CapacityTracker.trelloAPI.updateCardBadge(t, cardId, badgeText);
      } else {
        return CapacityTracker.trelloAPI.updateCardBadge(t, cardId, 'No capacity available');
      }
    });
  };

})(CapacityTracker);