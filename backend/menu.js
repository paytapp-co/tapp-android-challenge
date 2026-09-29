// All prices are integers in minor units (pence).

export const venue = {
  name: 'Riverside Stadium',
  location: 'Block C Kiosk',
  currency: 'GBP',
};

export const menu = [
  {
    id: 'burger',
    name: 'Classic Burger',
    category: 'Food',
    price: 850,
    available: true,
    modifiers: [
      { id: 'cheese', name: 'Add cheese', price: 80 },
      { id: 'bacon', name: 'Add bacon', price: 115 },
    ],
  },
  {
    id: 'hotdog',
    name: 'Hot Dog',
    category: 'Food',
    price: 610,
    available: false,
    modifiers: [{ id: 'onions', name: 'Fried onions', price: 50 }],
  },
  {
    id: 'chips',
    name: 'Chips',
    category: 'Food',
    price: 320,
    available: true,
    modifiers: [{ id: 'cheese-sauce', name: 'Cheese sauce', price: 110 }],
  },
  {
    id: 'cola',
    name: 'Cola',
    category: 'Drinks',
    price: 270,
    available: true,
    modifiers: [{ id: 'large', name: 'Make it large', price: 70 }],
  },
  {
    id: 'coffee',
    name: 'Coffee',
    category: 'Drinks',
    price: 435,
    available: true,
    modifiers: [{ id: 'oat', name: 'Oat milk', price: 40 }],
  },
  {
    id: 'water',
    name: 'Bottled Water',
    category: 'Drinks',
    price: 110,
    available: true,
    modifiers: [],
  },
  {
    id: 'lager',
    name: 'Pint of Lager',
    category: 'Drinks',
    price: 635,
    available: true,
    modifiers: [],
  },
];
