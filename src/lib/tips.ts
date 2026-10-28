/**
 * The words behind every "i" on the dashboard's figure boxes.
 *
 * Kept in one place, and in plain words, so that whoever reads a number can
 * find out what it counts and where it comes from without asking an engineer.
 * `tips.test.ts` holds them to that: whole sentences, short, no system terms.
 */
const RANGE = 'Follows the dates picked at the top of the page (all time if none).';

export const TIPS = {
  overview: {
    nairaFuel:
      'Naira we keep at Quidax to buy coins when our own stock runs out. "Lasts about" is how many days it covers at the current rate of use.',
    dailyBurn:
      'Average naira used per day over the last 7 days to buy coins from Quidax because our own stock was too low.',
    coinsBelowFloor:
      'Coins whose stock has fallen under the minimum set on the Inventory page. Buys of these coins cost us more until you restock.',
    marginForgone:
      'Profit lost per day because buys are filled through Quidax instead of from our own cheaper stock. Restocking brings it back to zero.',
    totalUsers: `Every customer account ever created, active or not. ${RANGE}`,
    activeUsers: `Customers who can sign in and trade right now. ${RANGE}`,
    suspendedUsers: `Customers an admin has suspended. They cannot sign in until someone lifts it. ${RANGE}`,
    kyc: `Approved: customers whose identity check passed. Pending: customers waiting for a check or a review. ${RANGE}`,
    transactions: `How many transactions of each kind. Pending includes ones on hold; failed includes ones being checked. ${RANGE}`,
    ngnWallet: `Naira that came in and went out through completed transactions. "Held" and "Locked" are what customers have right now, whatever the dates. ${RANGE}`,
    cryptoWallet: `Coin movements added up in dollars, each priced at the moment it happened, so old totals never change with today's prices. ${RANGE}`,
    earnings: `What the platform kept from completed transactions, in the currency each fee was charged in. Naira and dollars are never added together. ${RANGE}`,
    inventoryPanel:
      'The coins most in need of a restock. "Price vs what we paid" compares the price now with what we paid on average; "Profit missed / day" is what we lose while stock is low.',
    recentActivity: 'The latest customer transactions of any kind, newest first. Open "All" to search and filter them.',
  },

  users: {
    registered: 'Every customer account ever created, whatever its state.',
    active: 'Customers who can sign in and trade right now.',
    suspended: 'Customers an admin has suspended. Suspending signs them out at once.',
    verified: 'Customers whose identity check passed, at Basic level or above.',
    holdingFunds: 'Customers with any naira or coin in their account right now, not counting amounts locked in a trade.',
  },

  inventory: {
    nairaFuel:
      'Naira we keep at Quidax to buy coins when our own stock runs out. Green means more than 3 days of cover.',
    daysOfCover: 'How many days the naira fuel lasts if we keep spending at the average of the last 7 days.',
    coinsTracked: 'Coins we keep our own stock of. Each has a minimum level set on this page.',
    belowFloor: 'Coins whose stock has fallen under its minimum. Buys of these coins cost us more until you restock.',
  },

  fees: {
    accrued: 'Swap fees we have earned but not yet collected, valued in dollars at the moment each was charged.',
    worthNow: 'The same fees valued at today\'s prices. This is roughly what collecting them now would give us in USDT.',
    drift: 'How much the fees have gained or lost in value since they were charged, because they sit in coin until collected.',
    calls: 'Roughly how many requests to Quidax collecting every fee will take. It runs slowly in the background so trading is not affected.',
  },

  treasury: {
    rail: 'Our naira at the bank partner. Customer deposits land here and customer withdrawals are paid from here.',
    quidax: 'Our naira at Quidax, used to buy coins when our own stock runs low.',
    owed: 'Every customer\'s naira balance added together, including withdrawals still on their way. We must always hold at least this much.',
  },

  giftCards: {
    waiting: 'Gift cards customers have sent that no admin has accepted or rejected yet.',
    paidOut: 'Naira credited to customers for gift cards we accepted.',
    margin: 'What accepted cards actually sold for, minus what we paid customers. It goes negative if a card sold below our quote.',
  },

  kycAdvanced: {
    waiting: 'Advanced checks a rule could not decide. Each shows why it came to a person and the evidence beside the verified Basic record.',
    approvedToday: 'Advanced checks approved since midnight in Lagos, automatically or by an admin.',
    rejectedToday: 'Advanced checks rejected since midnight in Lagos. The customer saw a reason and may try again if attempts remain.',
  },

  dojahAdvanced: {
    switch: 'Turns the automatic ID, selfie and proof-of-address checks on or off for customers. Owners only.',
    liveness: 'How sure Dojah must be that the selfie is a real, live face. Under this, a person decides.',
    faceMatch: 'How alike the selfie and the ID photo must be. At the pass mark or above is approved; from the floor up to the pass mark a person decides; below the floor is rejected.',
    recency: 'How recent a proof-of-address document must be. A tenancy agreement must instead still be running today.',
    tries: 'How many times a customer may try each step per day and in total. A check that failed on our side does not count.',
  },

  referrals: {
    paidOut: 'Referral rewards already credited to customers\' naira balances.',
    pending: 'Rewards promised but not paid, because the friend has not met the condition yet (for example, verifying their identity). Some may never be paid.',
    referrals: 'Every time someone signed up with another customer\'s referral code.',
    programme: 'Whether new referrals are being recorded and rewarded. Change it in the form below.',
  },
} as const;
