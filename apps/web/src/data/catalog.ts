/**
 * Sample data for the frontend prototype. Replaced by Catalog_Service API data in Phase 3.
 * Prices are integer paise (minor units), matching the design's money convention.
 */

export interface Category {
  id: string;
  label: string;
  image: string;
}

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  pricePaise: number;
  veg: boolean;
  bestseller: boolean;
  image: string;
}

export interface Restaurant {
  id: string;
  name: string;
  cuisines: string[];
  categories: string[];
  area: string;
  rating: number;
  ratingCount: number;
  etaMinutes: number;
  distanceKm: number;
  deliveryFeePaise: number;
  costForTwoPaise: number;
  offer: string | null;
  pureVeg: boolean;
  image: string;
  menu: MenuItem[];
}

export interface Offer {
  id: string;
  title: string;
  subtitle: string;
  code: string;
  gradient: string;
}

export interface DishPick {
  restaurant: Restaurant;
  item: MenuItem;
}

const RUPEE = '\u20B9';

const IMG = {
  hero: '1504674900247-0877df9cc836',
  biryani: '1563379091339-03b21ab4a4f8',
  biryani2: '1589302168068-964664d93dc0',
  pizza: '1513104890138-7c749659a591',
  pizza2: '1565299624946-b28f40a0ae38',
  margherita: '1574071318508-1cdbab80d002',
  garlicBread: '1573140247632-f8fd74997d5c',
  tiramisu: '1571877227200-a0d98ea607e9',
  burger: '1568901346375-23c9450c58cd',
  burger2: '1550547660-d9450f859349',
  burgerFries: '1571091718767-18b5b1457add',
  fries: '1573080496219-bb080dd4f877',
  shake: '1572490122747-3968b75cc699',
  curry: '1585937421612-70a008356fbe',
  curry2: '1565557623262-b51c2513a641',
  samosa: '1601050690597-df0568f70950',
  dosa: '1668236543090-82eba5ee5976',
  idli: '1589301760014-d929f3979dbc',
  coffee: '1495474472287-4d71bcdd2085',
  noodles: '1585032226651-759b368d7246',
  ramen: '1569718212165-3a8278d5f624',
  dumplings: '1563245372-f21724e3856d',
  sushi: '1579871494447-9811cf80d66c',
  sushi2: '1553621042-f6e147245754',
  salad: '1512621776951-a57141f2eefd',
  bowl: '1546069901-ba9599a7e63c',
  bowl2: '1540189549336-e6e99c3679fe',
  juice: '1600271886742-f049cd451bba',
  parfait: '1488477181946-6428a0291777',
  donut: '1551024601-bec78aea704b',
  icecream: '1563805042-7684c019e1cb',
  cake: '1565958011703-44f9829ba187',
  cupcake: '1576618148400-f54bed99fcfd',
  wrap: '1626700051175-6818013e1d4f',
} as const;

export function photo(id: string, width = 800): string {
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${String(width)}&q=70`;
}

function dish(
  id: string,
  name: string,
  description: string,
  rupees: number,
  veg: boolean,
  image: string,
  bestseller = false,
): MenuItem {
  return { id, name, description, pricePaise: rupees * 100, veg, bestseller, image: photo(image, 400) };
}

export const heroImages = {
  main: photo(IMG.hero, 900),
  pizza: photo(IMG.pizza2, 300),
  dessert: photo(IMG.donut, 300),
} as const;

export const categories: readonly Category[] = [
  { id: 'biryani', label: 'Biryani', image: photo(IMG.biryani, 240) },
  { id: 'pizza', label: 'Pizza', image: photo(IMG.pizza, 240) },
  { id: 'burger', label: 'Burgers', image: photo(IMG.burger, 240) },
  { id: 'north-indian', label: 'North Indian', image: photo(IMG.curry, 240) },
  { id: 'south-indian', label: 'South Indian', image: photo(IMG.dosa, 240) },
  { id: 'chinese', label: 'Chinese', image: photo(IMG.noodles, 240) },
  { id: 'sushi', label: 'Sushi', image: photo(IMG.sushi, 240) },
  { id: 'healthy', label: 'Healthy', image: photo(IMG.salad, 240) },
  { id: 'desserts', label: 'Desserts', image: photo(IMG.donut, 240) },
  { id: 'rolls', label: 'Rolls', image: photo(IMG.wrap, 240) },
];

export const offers: readonly Offer[] = [
  { id: 'welcome', title: '50% OFF', subtitle: `up to ${RUPEE}100 on your first order`, code: 'WELCOME50', gradient: 'from-orange-600 to-rose-700' },
  { id: 'free-delivery', title: 'Free delivery', subtitle: `on orders above ${RUPEE}199`, code: 'FREEDEL', gradient: 'from-emerald-600 to-teal-800' },
  { id: 'biryani', title: `Flat ${RUPEE}75 OFF`, subtitle: 'on biryani feasts tonight', code: 'BIRYANI75', gradient: 'from-amber-600 to-orange-800' },
  { id: 'sweet', title: '30% OFF desserts', subtitle: 'Treat yourself after 9 PM', code: 'SWEET30', gradient: 'from-fuchsia-600 to-purple-800' },
];

export const restaurants: readonly Restaurant[] = [
  {
    id: 'biryani-blues', name: 'Biryani Blues House', cuisines: ['Biryani', 'Mughlai', 'Kebabs'],
    categories: ['biryani', 'north-indian'], area: 'Koramangala', rating: 4.4, ratingCount: 12400,
    etaMinutes: 32, distanceKm: 2.1, deliveryFeePaise: 3900, costForTwoPaise: 60000,
    offer: `50% OFF UPTO ${RUPEE}100`, pureVeg: false, image: photo(IMG.biryani),
    menu: [
      dish('bb-chicken', 'Hyderabadi Chicken Dum Biryani', 'Long-grain basmati slow-cooked with tender chicken, saffron and fried onions. Served with raita.', 349, false, IMG.biryani, true),
      dish('bb-mutton', 'Lucknowi Mutton Biryani', 'Fragrant Awadhi-style biryani with melt-in-the-mouth mutton and kewra.', 429, false, IMG.biryani2),
      dish('bb-paneer', 'Paneer Tikka Biryani', 'Smoky tandoori paneer layered with aromatic rice and fresh mint.', 299, true, IMG.biryani2),
      dish('bb-curry', 'Chicken Korma', 'Mild, creamy Mughlai curry with cashew and cardamom.', 279, false, IMG.curry2),
      dish('bb-dessert', 'Shahi Tukda', 'Ghee-toasted bread soaked in saffron rabdi.', 129, true, IMG.cake),
    ],
  },
  {
    id: 'slice-of-napoli', name: 'Slice of Napoli', cuisines: ['Pizza', 'Italian'],
    categories: ['pizza'], area: 'Indiranagar', rating: 4.3, ratingCount: 8900,
    etaMinutes: 28, distanceKm: 3.4, deliveryFeePaise: 2900, costForTwoPaise: 70000,
    offer: `FLAT ${RUPEE}125 OFF ABOVE ${RUPEE}499`, pureVeg: false, image: photo(IMG.pizza2),
    menu: [
      dish('sn-margherita', 'Classic Margherita', 'San Marzano tomato, fior di latte and fresh basil on a wood-fired crust.', 299, true, IMG.margherita, true),
      dish('sn-pepperoni', 'Pepperoni Feast', 'Double pepperoni, mozzarella and a drizzle of hot honey.', 449, false, IMG.pizza2),
      dish('sn-farmhouse', 'Farmhouse Veggie', 'Peppers, mushrooms, sweet corn, olives and onions.', 379, true, IMG.pizza),
      dish('sn-garlic', 'Cheesy Garlic Bread', 'Buttery garlic loaf topped with bubbling mozzarella.', 149, true, IMG.garlicBread),
      dish('sn-tiramisu', 'Classic Tiramisu', 'Espresso-soaked ladyfingers with mascarpone cream.', 199, true, IMG.tiramisu),
    ],
  },
  {
    id: 'burger-barn', name: 'Burger Barn', cuisines: ['Burgers', 'American', 'Shakes'],
    categories: ['burger'], area: 'Koramangala', rating: 4.1, ratingCount: 15600,
    etaMinutes: 22, distanceKm: 1.2, deliveryFeePaise: 0, costForTwoPaise: 50000,
    offer: 'FREE DELIVERY', pureVeg: false, image: photo(IMG.burger),
    menu: [
      dish('br-smash', 'Classic Smash Burger', 'Two crispy-edged patties, American cheese, pickles and house sauce.', 219, false, IMG.burger, true),
      dish('br-veg', 'Crispy Veg Supreme', 'Golden veggie patty, lettuce, tomato and chipotle mayo.', 159, true, IMG.burger2),
      dish('br-double', 'Double Cheese Stack', 'Stacked beef-style chicken patties with double cheddar, served with fries.', 279, false, IMG.burgerFries),
      dish('br-fries', 'Peri Peri Fries', 'Skin-on fries tossed in fiery peri peri seasoning.', 119, true, IMG.fries),
      dish('br-shake', 'Belgian Chocolate Shake', 'Thick shake blended with Belgian chocolate and ice cream.', 149, true, IMG.shake),
    ],
  },
  {
    id: 'dosa-express', name: 'Dosa Express', cuisines: ['South Indian', 'Breakfast'],
    categories: ['south-indian'], area: 'HSR Layout', rating: 4.6, ratingCount: 21300,
    etaMinutes: 25, distanceKm: 2.8, deliveryFeePaise: 2500, costForTwoPaise: 30000,
    offer: `20% OFF UPTO ${RUPEE}50`, pureVeg: true, image: photo(IMG.dosa),
    menu: [
      dish('de-masala', 'Masala Dosa', 'Crisp golden dosa with spiced potato, coconut chutney and sambar.', 129, true, IMG.dosa, true),
      dish('de-mysore', 'Mysore Masala Dosa', 'Dosa smeared with fiery red chutney and filled with potato masala.', 149, true, IMG.dosa),
      dish('de-idli', 'Ghee Podi Idli', 'Soft mini idlis tossed in ghee and gunpowder spice.', 99, true, IMG.idli),
      dish('de-vada', 'Medu Vada (2 pcs)', 'Crunchy lentil doughnuts served with sambar.', 89, true, IMG.idli),
      dish('de-coffee', 'Filter Coffee', 'Strong South Indian decoction with frothy hot milk.', 59, true, IMG.coffee),
    ],
  },
  {
    id: 'punjab-grill', name: 'Punjab Grill Kitchen', cuisines: ['North Indian', 'Punjabi', 'Tandoor'],
    categories: ['north-indian'], area: 'Indiranagar', rating: 4.5, ratingCount: 9800,
    etaMinutes: 38, distanceKm: 4.6, deliveryFeePaise: 4500, costForTwoPaise: 90000,
    offer: `${RUPEE}150 OFF ABOVE ${RUPEE}699`, pureVeg: false, image: photo(IMG.curry),
    menu: [
      dish('pg-butter-chicken', 'Butter Chicken', 'Charcoal-grilled chicken in a velvety tomato and butter gravy.', 389, false, IMG.curry, true),
      dish('pg-dal', 'Dal Makhani', 'Black lentils slow-simmered overnight with cream and butter.', 269, true, IMG.curry2),
      dish('pg-paneer', 'Paneer Butter Masala', 'Soft paneer cubes in a rich, mildly sweet makhani sauce.', 299, true, IMG.curry2),
      dish('pg-naan', 'Garlic Butter Naan', 'Tandoor-baked naan brushed with garlic butter.', 69, true, IMG.curry),
      dish('pg-samosa', 'Punjabi Samosa (2 pcs)', 'Flaky pastry stuffed with spiced potato and peas.', 79, true, IMG.samosa),
    ],
  },
  {
    id: 'wok-this-way', name: 'Wok This Way', cuisines: ['Chinese', 'Asian', 'Momos'],
    categories: ['chinese'], area: 'BTM Layout', rating: 4.2, ratingCount: 7400,
    etaMinutes: 30, distanceKm: 3.9, deliveryFeePaise: 3500, costForTwoPaise: 55000,
    offer: `40% OFF UPTO ${RUPEE}80`, pureVeg: false, image: photo(IMG.noodles),
    menu: [
      dish('wt-hakka', 'Veg Hakka Noodles', 'Wok-tossed noodles with crunchy vegetables and soy.', 199, true, IMG.noodles, true),
      dish('wt-chilli', 'Chilli Chicken Dry', 'Crispy chicken tossed with peppers, onions and green chilli.', 279, false, IMG.noodles),
      dish('wt-momos', 'Steamed Veg Momos (8 pcs)', 'Juicy dumplings with fiery red chutney.', 159, true, IMG.dumplings),
      dish('wt-ramen', 'Chicken Ramen Bowl', 'Rich broth, springy noodles, soft egg and spring onion.', 329, false, IMG.ramen),
      dish('wt-manchurian', 'Veg Manchurian Gravy', 'Vegetable dumplings in a tangy garlic sauce.', 219, true, IMG.dumplings),
    ],
  },
  {
    id: 'sakura-sushi', name: 'Sakura Sushi Bar', cuisines: ['Japanese', 'Sushi'],
    categories: ['sushi'], area: 'Indiranagar', rating: 4.7, ratingCount: 3200,
    etaMinutes: 42, distanceKm: 5.8, deliveryFeePaise: 5900, costForTwoPaise: 160000,
    offer: null, pureVeg: false, image: photo(IMG.sushi2),
    menu: [
      dish('ss-avocado', 'Avocado Cucumber Maki', 'Creamy avocado and crisp cucumber rolled in seasoned rice.', 329, true, IMG.sushi, true),
      dish('ss-salmon', 'Salmon Nigiri (4 pcs)', 'Hand-pressed rice topped with fresh Atlantic salmon.', 499, false, IMG.sushi2),
      dish('ss-california', 'California Roll', 'Crab stick, avocado and cucumber with tobiko.', 429, false, IMG.sushi),
      dish('ss-katsu', 'Chicken Katsu Bowl', 'Panko-crusted chicken over rice with katsu sauce.', 389, false, IMG.ramen),
      dish('ss-mochi', 'Matcha Mochi Ice Cream', 'Chewy mochi filled with matcha ice cream.', 199, true, IMG.icecream),
    ],
  },
  {
    id: 'green-bowl', name: 'Green Bowl Co.', cuisines: ['Healthy', 'Salads', 'Bowls'],
    categories: ['healthy'], area: 'HSR Layout', rating: 4.4, ratingCount: 5100,
    etaMinutes: 20, distanceKm: 1.8, deliveryFeePaise: 0, costForTwoPaise: 45000,
    offer: 'FREE DELIVERY', pureVeg: true, image: photo(IMG.bowl),
    menu: [
      dish('gb-quinoa', 'Quinoa Power Bowl', 'Quinoa, roasted veggies, chickpeas and tahini dressing.', 279, true, IMG.bowl, true),
      dish('gb-greek', 'Mediterranean Greek Salad', 'Cucumber, tomato, olives and feta with oregano vinaigrette.', 239, true, IMG.salad),
      dish('gb-falafel', 'Falafel Hummus Bowl', 'Crispy falafel, hummus, pickled onion and greens.', 259, true, IMG.bowl2),
      dish('gb-juice', 'Cold-Pressed Green Juice', 'Spinach, apple, cucumber and ginger.', 149, true, IMG.juice),
      dish('gb-parfait', 'Berry Yogurt Parfait', 'Greek yogurt layered with berries and granola.', 179, true, IMG.parfait),
    ],
  },
  {
    id: 'sweet-tooth', name: 'Sweet Tooth Patisserie', cuisines: ['Desserts', 'Bakery', 'Ice Cream'],
    categories: ['desserts'], area: 'Koramangala', rating: 4.6, ratingCount: 11700,
    etaMinutes: 24, distanceKm: 1.5, deliveryFeePaise: 2500, costForTwoPaise: 40000,
    offer: `FLAT ${RUPEE}60 OFF`, pureVeg: true, image: photo(IMG.cake),
    menu: [
      dish('st-truffle', 'Belgian Chocolate Truffle Slice', 'Layers of dark chocolate sponge and silky ganache.', 179, true, IMG.cake, true),
      dish('st-donuts', 'Glazed Donut Box (4 pcs)', 'Assorted glazed and sprinkled donuts.', 249, true, IMG.donut),
      dish('st-cupcake', 'Red Velvet Cupcake', 'Moist red velvet with cream cheese frosting.', 99, true, IMG.cupcake),
      dish('st-sundae', 'Hot Fudge Sundae', 'Vanilla ice cream, hot fudge, nuts and a cherry.', 159, true, IMG.icecream),
      dish('st-tiramisu', 'Tiramisu Jar', 'Coffee-soaked sponge with mascarpone, in a jar.', 189, true, IMG.tiramisu),
    ],
  },
  {
    id: 'roll-call', name: 'Roll Call', cuisines: ['Rolls', 'Street Food', 'Wraps'],
    categories: ['rolls'], area: 'BTM Layout', rating: 4.0, ratingCount: 6600,
    etaMinutes: 18, distanceKm: 0.9, deliveryFeePaise: 1500, costForTwoPaise: 35000,
    offer: `30% OFF UPTO ${RUPEE}75`, pureVeg: false, image: photo(IMG.wrap),
    menu: [
      dish('rc-chicken', 'Chicken Tikka Kathi Roll', 'Smoky chicken tikka, onions and mint mayo in a flaky paratha.', 169, false, IMG.wrap, true),
      dish('rc-paneer', 'Paneer Tikka Roll', 'Char-grilled paneer with pickled onions and chutney.', 149, true, IMG.wrap),
      dish('rc-egg', 'Double Egg Roll', 'Kolkata-style egg-coated paratha with onions and chilli.', 119, false, IMG.wrap),
      dish('rc-chaat', 'Crispy Samosa Chaat', 'Crushed samosa with chole, yogurt and tamarind chutney.', 89, true, IMG.samosa),
    ],
  },
  {
    id: 'tandoor-nights', name: 'Tandoor Nights', cuisines: ['North Indian', 'Kebabs', 'Biryani'],
    categories: ['north-indian', 'biryani'], area: 'Koramangala', rating: 3.9, ratingCount: 4300,
    etaMinutes: 45, distanceKm: 6.2, deliveryFeePaise: 4900, costForTwoPaise: 80000,
    offer: null, pureVeg: false, image: photo(IMG.curry2),
    menu: [
      dish('tn-tandoori', 'Tandoori Chicken (Half)', 'Yogurt and spice marinated chicken, roasted in the tandoor.', 329, false, IMG.curry2, true),
      dish('tn-biryani', 'Chicken Dum Biryani', 'Classic dum biryani with tender chicken and saffron rice.', 319, false, IMG.biryani),
      dish('tn-paneer', 'Paneer Tikka', 'Chargrilled cottage cheese with peppers and onion.', 269, true, IMG.curry),
      dish('tn-paratha', 'Laccha Paratha', 'Flaky, layered whole-wheat flatbread.', 59, true, IMG.curry2),
    ],
  },
];

export const bestsellers: readonly DishPick[] = restaurants.flatMap((restaurant) =>
  restaurant.menu.filter((item) => item.bestseller).map((item) => ({ restaurant, item })),
);