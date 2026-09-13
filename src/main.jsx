import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import { AddressProvider } from './context/AddressContext.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { CartProvider } from './context/CartContext.jsx'
import { DesignProvider } from './context/DesignContext.jsx'
import { OrderProvider } from './context/OrderContext.jsx'
import { ProductProvider } from './context/ProductContext.jsx'
import { ToastProvider } from './context/ToastContext.jsx'
import { WishlistProvider } from './context/WishlistContext.jsx'
import './firebase/firebase.js'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <AddressProvider>
              <DesignProvider>
                <WishlistProvider>
                  <OrderProvider>
                    <CartProvider>
                      <ProductProvider>
                        <App />
                      </ProductProvider>
                    </CartProvider>
                  </OrderProvider>
                </WishlistProvider>
              </DesignProvider>
            </AddressProvider>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
