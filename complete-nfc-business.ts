// ##########################################
// # Project Structure (Next.js 13+ with App Router)
// ##########################################
/*
nfc-business/
├── app/
│   ├── layout.tsx           # Root layout
│   ├── page.tsx            # Homepage
│   ├── design/             # Card designer routes
│   │   ├── page.tsx        # Designer page
│   │   └── layout.tsx      # Designer layout
│   └── checkout/           # Checkout routes
├── components/             # Reusable components
├── lib/                    # Utility functions
└── public/                 # Static assets
*/

// ##########################################
// # Root Layout (app/layout.tsx)
// ##########################################

import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { Analytics } from '@/components/analytics';

export const metadata = {
  title: 'NFC Business Cards - Professional Digital Business Cards',
  description: 'Create custom NFC-enabled business cards with our professional design tools.',
  keywords: ['NFC cards', 'digital business cards', 'smart business cards']
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Load critical CSS and fonts */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
      </head>
      <body>
        {/* Theme provider for dark/light mode */}
        <ThemeProvider>
          {/* Navigation component */}
          <Navigation />
          
          {/* Main content */}
          <main>{children}</main>
          
          {/* Footer component */}
          <Footer />
          
          {/* Toast notifications */}
          <Toaster />
          
          {/* Analytics tracking */}
          <Analytics />
        </ThemeProvider>
      </body>
    </html>
  );
}

// ##########################################
// # Homepage (app/page.tsx)
// ##########################################

import { HeroSection } from '@/components/marketing/hero';
import { FeatureGrid } from '@/components/marketing/features';
import { Pricing } from '@/components/marketing/pricing';
import { Testimonials } from '@/components/marketing/testimonials';

export default function HomePage() {
  return (
    <>
      {/* Hero section with main CTA */}
      <HeroSection 
        title="Transform Your Business Cards"
        subtitle="Create stunning NFC-enabled business cards that make sharing your details as simple as a tap"
      />
      
      {/* Feature showcase */}
      <FeatureGrid features={[
        {
          title: 'Easy Design Tools',
          description: 'Intuitive drag-and-drop designer with professional templates',
          icon: <PenTool className="w-6 h-6" />
        },
        // ... more features
      ]} />
      
      {/* Pricing plans */}
      <Pricing plans={PRICING_PLANS} />
      
      {/* Customer testimonials */}
      <Testimonials testimonials={TESTIMONIALS} />
    </>
  );
}

// ##########################################
// # Card Designer (app/design/page.tsx)
// ##########################################

import { DesignProvider } from '@/contexts/design-context';
import { NFCDesigner } from '@/components/designer/nfc-designer';
import { DesignControls } from '@/components/designer/design-controls';

export default function DesignPage() {
  return (
    <DesignProvider>
      <div className="flex min-h-screen">
        {/* Left sidebar with design tools */}
        <DesignControls />
        
        {/* Main design canvas */}
        <NFCDesigner />
        
        {/* Right sidebar with properties panel */}
        <PropertiesPanel />
      </div>
    </DesignProvider>
  );
}

// ##########################################
// # Design Context (contexts/design-context.tsx)
// ##########################################

interface DesignState {
  // Current design configuration
  design: {
    template: string;
    elements: DesignElement[];
    material: MaterialType;
    nfcType: NFCChipType;
    colors: {
      primary: string;
      secondary: string;
      background: string;
    };
  };
  
  // Pricing calculations
  pricing: {
    basePrice: number;
    materialCost: number;
    nfcCost: number;
    quantity: number;
    discount: number;
    total: number;
  };
  
  // UI state
  ui: {
    selectedElement: string | null;
    activeTab: string;
    isDragging: boolean;
  };
}

// Create the context with initial state
export const DesignContext = createContext<DesignContextType | undefined>(undefined);

// Context provider component
export function DesignProvider({ children }: { children: React.ReactNode }) {
  // Initialize state with default values
  const [state, dispatch] = useReducer(designReducer, INITIAL_STATE);
  
  // Calculate pricing whenever design changes
  useEffect(() => {
    dispatch({ 
      type: 'UPDATE_PRICING', 
      payload: calculatePricing(state.design, state.pricing.quantity) 
    });
  }, [state.design, state.pricing.quantity]);
  
  return (
    <DesignContext.Provider value={{ state, dispatch }}>
      {children}
    </DesignContext.Provider>
  );
}

// ##########################################
// # Pricing Calculator (lib/pricing.ts)
// ##########################################

export function calculatePricing(design: Design, quantity: number): PricingDetails {
  // Base prices for different materials
  const materialPrices = {
    PVC: 0,
    Metal: 5.00,
    Wood: 3.00,
    'Premium Plastic': 2.00
  };
  
  // NFC chip costs
  const nfcPrices = {
    NTAG213: 0,
    NTAG215: 2.00,
    NTAG216: 4.00
  };
  
  // Calculate base cost
  const basePrice = 9.99;
  const materialCost = materialPrices[design.material];
  const nfcCost = nfcPrices[design.nfcType];
  
  // Calculate quantity discounts
  let discount = 0;
  if (quantity >= 1000) discount = 0.30;
  else if (quantity >= 500) discount = 0.20;
  else if (quantity >= 100) discount = 0.10;
  
  // Calculate total
  const subtotal = (basePrice + materialCost + nfcCost) * quantity;
  const discountAmount = subtotal * discount;
  const total = subtotal - discountAmount;
  
  return {
    basePrice,
    materialCost,
    nfcCost,
    quantity,
    discount,
    discountAmount,
    subtotal,
    total
  };
}

// ##########################################
// # Payment Integration (components/checkout/payment-form.tsx)
// ##########################################

import { loadStripe } from '@stripe/stripe-js';
import { CardElement, Elements } from '@stripe/react-stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY!);

export function PaymentForm({ order }: { order: Order }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Handle form submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    
    try {
      // Create payment intent
      const response = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order })
      });
      
      const { clientSecret } = await response.json();
      
      // Confirm payment
      const stripe = await stripePromise;
      const { error: stripeError } = await stripe!.confirmCardPayment(clientSecret);
      
      if (stripeError) {
        setError(stripeError.message!);
      } else {
        // Payment successful
        router.push('/order-confirmation');
      }
    } catch (err) {
      setError('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <CardElement />
      <Button type="submit" disabled={loading}>
        {loading ? 'Processing...' : 'Pay Now'}
      </Button>
      {error && <div className="text-red-500">{error}</div>}
    </form>
  );
}

// ##########################################
// # Order Management (lib/orders.ts)
// ##########################################

export async function createOrder(orderData: OrderData): Promise<Order> {
  // Validate order data
  const validationResult = validateOrderData(orderData);
  if (!validationResult.success) {
    throw new Error(validationResult.error);
  }
  
  // Generate unique order ID
  const orderId = generateOrderId();
  
  // Store order in database
  const order = await prisma.order.create({
    data: {
      id: orderId,
      userId: orderData.userId,
      design: orderData.design,
      quantity: orderData.quantity,
      pricing: orderData.pricing,
      shipping: orderData.shipping,
      status: 'pending'
    }
  });
  
  // Send confirmation email
  await sendOrderConfirmationEmail(order);
  
  return order;
}

// ##########################################
// # Analytics Integration (components/analytics.tsx)
// ##########################################

declare global {
  interface Window {
    gtag: (...args: any[]) => void;
  }
}

export function Analytics() {
  // Track page views
  useEffect(() => {
    const handleRouteChange = (url: string) => {
      window.gtag('config', GA_TRACKING_ID, { page_path: url });
    };
    
    router.events.on('routeChangeComplete', handleRouteChange);
    return () => router.events.off('routeChangeComplete', handleRouteChange);
  }, []);
  
  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_TRACKING_ID}`}
      />
      <Script
        id="gtag-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_TRACKING_ID}');
          `
        }}
      />
    </>
  );
}
