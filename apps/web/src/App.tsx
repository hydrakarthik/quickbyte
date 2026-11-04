import { useEffect, useState, type ReactNode } from 'react';
import { accountReducer, reviveAccount, signedOut } from '@/account/account';
import {
  cartReducer,
  computeBill,
  emptyCart,
  itemCount,
  quantityOf,
  reviveCart,
  type CartControls,
} from '@/cart/cart';
import { BottomNav } from '@/components/BottomNav';
import { CartBar } from '@/components/CartBar';
import { CartDrawer } from '@/components/CartDrawer';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { Modal } from '@/components/Modal';
import { RestaurantSheet } from '@/components/RestaurantSheet';
import { restaurants } from '@/data/catalog';
import { NO_TOGGLES, type FilterToggles, type SortKey } from '@/lib/filter-restaurants';
import { href, navigate, useRoute, type Route } from '@/lib/router';
import { usePersistentReducer } from '@/lib/storage';
import { useNow } from '@/lib/use-now';
import {
  createOrder,
  isActive,
  newOrderId,
  ordersReducer,
  reorderLines,
  reviveOrders,
  statusAt,
  type Order,
} from '@/orders/orders';
import { AccountPage } from '@/pages/AccountPage';
import { CheckoutPage, type PlaceOrderDetails } from '@/pages/CheckoutPage';
import { HomePage } from '@/pages/HomePage';
import { LoginPage } from '@/pages/LoginPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { OrderTrackingPage } from '@/pages/OrderTrackingPage';

interface PendingReplace {
  message: string;
  onConfirm: () => void;
}

const NO_ORDERS: Order[] = [];

function reviveStoredCart(raw: unknown) {
  return reviveCart(raw, restaurants);
}

function titleFor(route: Route): string {
  switch (route.name) {
    case 'home':
      return 'QuickByte | Food delivery in Bengaluru';
    case 'checkout':
      return 'Checkout | QuickByte';
    case 'orders':
      return 'Your orders | QuickByte';
    case 'order':
      return `Order #${route.orderId} | QuickByte`;
    case 'account':
      return 'Your account | QuickByte';
    case 'login':
      return 'Sign in | QuickByte';
  }
}

export function App() {
  const route = useRoute();
  const routeKey = href(route);

  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [toggles, setToggles] = useState<FilterToggles>(NO_TOGGLES);
  const [sort, setSort] = useState<SortKey>('relevance');
  const [openRestaurantId, setOpenRestaurantId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [pendingReplace, setPendingReplace] = useState<PendingReplace | null>(null);

  const [cart, dispatchCart] = usePersistentReducer('cart', cartReducer, emptyCart, reviveStoredCart);
  const [orders, dispatchOrders] = usePersistentReducer('orders', ordersReducer, NO_ORDERS, reviveOrders);
  const [account, dispatchAccount] = usePersistentReducer('account', accountReducer, signedOut, reviveAccount);

  const onTrackingScreen = route.name === 'order' || route.name === 'orders';
  const now = useNow(onTrackingScreen ? 1000 : 5000, orders.length > 0);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [routeKey]);

  useEffect(() => {
    document.title = titleFor(route);
  }, [route]);

  const openRestaurant = restaurants.find((r) => r.id === openRestaurantId) ?? null;
  const cartRestaurant = restaurants.find((r) => r.id === cart.restaurantId) ?? null;
  const count = itemCount(cart);
  const bill = computeBill(cart, cartRestaurant?.deliveryFeePaise ?? 0);
  const liveOrder = orders.find((order) => isActive(statusAt(order, now))) ?? null;
  const cartRestaurantName = cartRestaurant?.name ?? 'another restaurant';

  const controls: CartControls = {
    quantityOf: (itemId) => quantityOf(cart, itemId),
    add: (restaurant, item) => {
      const add = () => {
        dispatchCart({ type: 'add', restaurantId: restaurant.id, item });
      };
      if (cart.restaurantId !== null && cart.restaurantId !== restaurant.id) {
        setPendingReplace({
          message: `Your cart has dishes from ${cartRestaurantName}. Start a new cart with ${item.name} from ${restaurant.name}?`,
          onConfirm: add,
        });
        return;
      }
      add();
    },
    increment: (itemId) => {
      dispatchCart({ type: 'increment', itemId });
    },
    decrement: (itemId) => {
      dispatchCart({ type: 'decrement', itemId });
    },
  };

  function clearFilters() {
    setQuery('');
    setCategory(null);
    setToggles(NO_TOGGLES);
    setSort('relevance');
  }

  function changeQuery(value: string) {
    setQuery(value);
    if (route.name !== 'home') navigate({ name: 'home' });
  }

  function openCart() {
    setOpenRestaurantId(null);
    setCartOpen(true);
  }

  function goToCheckout() {
    setCartOpen(false);
    navigate({ name: 'checkout' });
  }

  function focusSearch() {
    if (route.name !== 'home') navigate({ name: 'home' });
    window.setTimeout(() => {
      document.getElementById('site-search')?.focus();
    }, 0);
  }

  function placeOrder(details: PlaceOrderDetails) {
    if (!cartRestaurant || cart.lines.length === 0) return;
    const placedAt = Date.now();
    const order = createOrder({ id: newOrderId(placedAt), restaurant: cartRestaurant, cart, bill, placedAt, ...details });
    dispatchOrders({ type: 'place', order });
    dispatchCart({ type: 'clear' });
    navigate({ name: 'order', orderId: order.id });
  }

  function reorder(order: Order) {
    const restaurant = restaurants.find((r) => r.id === order.restaurantId);
    if (!restaurant) return;
    const lines = reorderLines(order, restaurant);
    if (lines.length === 0) return;
    const apply = () => {
      dispatchCart({ type: 'replace', restaurantId: restaurant.id, lines });
      navigate({ name: 'checkout' });
    };
    if (cart.lines.length > 0) {
      setPendingReplace({
        message: `Your cart has dishes from ${cartRestaurantName}. Replace them with your past order from ${restaurant.name}?`,
        onConfirm: apply,
      });
      return;
    }
    apply();
  }

  function renderPage(): ReactNode {
    switch (route.name) {
      case 'home':
        return (
          <HomePage
            query={query}
            category={category}
            onCategoryChange={setCategory}
            toggles={toggles}
            onToggle={(key) => {
              setToggles((current) => ({ ...current, [key]: !current[key] }));
            }}
            sort={sort}
            onSortChange={setSort}
            onClearFilters={clearFilters}
            controls={controls}
            onOpenRestaurant={setOpenRestaurantId}
            liveOrder={liveOrder}
            now={now}
          />
        );
      case 'checkout':
        return (
          <CheckoutPage
            cart={cart}
            restaurant={cartRestaurant}
            bill={bill}
            controls={controls}
            account={account}
            onAddAddress={(address) => {
              dispatchAccount({ type: 'addAddress', address });
            }}
            onSelectAddress={(addressId) => {
              dispatchAccount({ type: 'selectAddress', addressId });
            }}
            onPlaceOrder={placeOrder}
          />
        );
      case 'orders':
        return <OrdersPage orders={orders} now={now} onReorder={reorder} />;
      case 'order': {
        const order = orders.find((o) => o.id === route.orderId);
        return (
          <OrderTrackingPage
            key={route.orderId}
            order={order}
            restaurant={restaurants.find((r) => r.id === order?.restaurantId)}
            now={now}
            onCancel={(orderId) => {
              dispatchOrders({ type: 'cancel', orderId, at: Date.now() });
            }}
            onRate={(orderId, rating) => {
              dispatchOrders({ type: 'rate', orderId, rating });
            }}
            onReorder={reorder}
          />
        );
      }
      case 'account':
        return (
          <AccountPage
            account={account}
            orderCount={orders.length}
            onSignOut={() => {
              dispatchAccount({ type: 'signOut' });
              navigate({ name: 'home' });
            }}
          />
        );
      case 'login':
        return (
          <LoginPage
            next={route.next}
            onSignIn={(user) => {
              dispatchAccount({ type: 'signIn', user });
              navigate(route.next === 'checkout' ? { name: 'checkout' } : { name: 'home' });
            }}
          />
        );
    }
  }

  return (
    <div id="top" className="min-h-screen bg-background pb-16 md:pb-0">
      <Header
        route={route}
        query={query}
        onQueryChange={changeQuery}
        cartCount={count}
        onOpenCart={openCart}
        userName={account.user?.name ?? null}
      />

      <main className={route.name === 'home' ? 'pb-28' : 'pb-12'}>{renderPage()}</main>

      <Footer />

      {route.name === 'home' && count > 0 && cartRestaurant && !cartOpen && openRestaurant === null ? (
        <CartBar count={count} subtotalPaise={bill.itemTotalPaise} restaurantName={cartRestaurant.name} onOpen={openCart} />
      ) : null}

      <BottomNav route={route} cartCount={count} signedIn={account.user !== null} onSearch={focusSearch} onOpenCart={openCart} />

      <RestaurantSheet
        key={openRestaurant?.id ?? 'closed'}
        restaurant={openRestaurant}
        onClose={() => {
          setOpenRestaurantId(null);
        }}
        controls={controls}
        cartCount={openRestaurant !== null && cart.restaurantId === openRestaurant.id ? count : 0}
        cartSubtotalPaise={bill.itemTotalPaise}
        onOpenCart={openCart}
      />

      <CartDrawer
        open={cartOpen}
        onClose={() => {
          setCartOpen(false);
        }}
        cart={cart}
        restaurant={cartRestaurant}
        bill={bill}
        controls={controls}
        onClear={() => {
          dispatchCart({ type: 'clear' });
        }}
        onCheckout={goToCheckout}
      />

      <Modal
        open={pendingReplace !== null}
        onClose={() => {
          setPendingReplace(null);
        }}
        labelledBy="replace-cart-heading"
        variant="dialog"
      >
        {pendingReplace ? (
          <div className="p-6">
            <h2 id="replace-cart-heading" className="text-lg font-extrabold">
              Replace cart items?
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">{pendingReplace.message}</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setPendingReplace(null);
                }}
                className="min-h-11 rounded-xl border border-border font-bold transition hover:bg-muted"
              >
                Keep cart
              </button>
              <button
                type="button"
                onClick={() => {
                  pendingReplace.onConfirm();
                  setPendingReplace(null);
                }}
                className="min-h-11 rounded-xl bg-primary font-bold text-primary-foreground transition hover:brightness-110"
              >
                Replace
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}