import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import ScrollToTop from './components/ScrollToTop.jsx'
import ToastViewport from './components/ToastViewport.jsx'
import RouteMetadata from './components/RouteMetadata.jsx'
import LoadingSpinner from './components/LoadingSpinner.jsx'
import Cart from './pages/Cart.jsx'
import ForgotPassword from './pages/ForgotPassword.jsx'
import Home from './pages/Home.jsx'
import Login from './pages/Login.jsx'
import ProductDetails from './pages/ProductDetails.jsx'
import Search from './pages/Search.jsx'
import Shop from './pages/Shop.jsx'
import Signup from './pages/Signup.jsx'
import NotFound from './pages/NotFound.jsx'
import PlaceholderPage from './pages/PlaceholderPage.jsx'
import AdminRoute from './routes/AdminRoute.jsx'
import ProtectedRoute from './routes/ProtectedRoute.jsx'
import './App.css'

const AIAssistant = lazy(() => import('./components/ai/AIAssistant.jsx'))
const AdminLayout = lazy(() => import('./components/admin/AdminLayout.jsx'))
const Checkout = lazy(() => import('./pages/Checkout.jsx'))
const CustomizeVest = lazy(() => import('./pages/CustomizeVest.jsx'))
const Account = lazy(() => import('./pages/Account.jsx'))
const Addresses = lazy(() => import('./pages/Addresses.jsx'))
const OrderDetails = lazy(() => import('./pages/OrderDetails.jsx'))
const OrderSuccess = lazy(() => import('./pages/OrderSuccess.jsx'))
const Orders = lazy(() => import('./pages/Orders.jsx'))
const Profile = lazy(() => import('./pages/Profile.jsx'))
const SavedDesigns = lazy(() => import('./pages/SavedDesigns.jsx'))
const Wishlist = lazy(() => import('./pages/Wishlist.jsx'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard.jsx'))
const AdminOrderDetails = lazy(() => import('./pages/admin/AdminOrderDetails.jsx'))
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders.jsx'))
const AdminProductForm = lazy(() => import('./pages/admin/AdminProductForm.jsx'))
const AdminProducts = lazy(() => import('./pages/admin/AdminProducts.jsx'))
const AdminReviews = lazy(() => import('./pages/admin/AdminReviews.jsx'))
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers.jsx'))

function PageFallback() {
  return (
    <main className="section-shell page-fallback" aria-busy="true">
      <LoadingSpinner label="Loading page" />
    </main>
  )
}

function App() {
  return (
    <>
      <ScrollToTop />
      <RouteMetadata />
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/search" element={<Search />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/customize" element={<CustomizeVest />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
          <Route path="/account/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/account/orders" element={<ProtectedRoute><Orders /></ProtectedRoute>} />
          <Route path="/account/orders/:orderId" element={<ProtectedRoute><OrderDetails /></ProtectedRoute>} />
          <Route path="/account/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
          <Route path="/account/addresses" element={<ProtectedRoute><Addresses /></ProtectedRoute>} />
          <Route path="/account/designs" element={<ProtectedRoute><SavedDesigns /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<AdminDashboard />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="products/new" element={<AdminProductForm />} />
            <Route path="products/:id/edit" element={<AdminProductForm />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="orders/:id" element={<AdminOrderDetails />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="users" element={<AdminUsers />} />
          </Route>
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/about" element={<PlaceholderPage title="About Us" text="GINARO creates premium everyday essentials with comfort-first fabrics, reliable fits and clean wardrobe staples." />} />
          <Route path="/contact" element={<PlaceholderPage title="Contact Us" text="Customer support options will be connected soon. For now, this page keeps the storefront navigation complete." />} />
          <Route path="/shipping" element={<PlaceholderPage title="Shipping" text="Shipping details and delivery timelines will be finalized before launch." />} />
          <Route path="/returns" element={<PlaceholderPage title="Returns" text="Easy return support is part of the GINARO experience. Full return rules will be added before launch." />} />
          <Route path="/size-guide" element={<PlaceholderPage title="Size Guide" text="A detailed vest, pajama and combo size guide will be published here before launch." />} />
          <Route path="/faq" element={<PlaceholderPage title="FAQ" text="Answers about products, sizing, delivery and customization will be collected here." />} />
          <Route path="/privacy" element={<PlaceholderPage title="Privacy Policy" text="The full privacy policy will be added before launch." />} />
          <Route path="/terms" element={<PlaceholderPage title="Terms & Conditions" text="Store terms for GINARO Cash on Delivery orders will be finalized before launch." />} />
          <Route path="/404" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
      <Suspense fallback={null}>
        <AIAssistant />
      </Suspense>
      <ToastViewport />
    </>
  )
}

export default App
