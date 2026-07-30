import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import SEO from '../components/common/SEO';
import { ShieldCheck, CheckCircle2, ArrowLeft, Loader2 } from 'lucide-react';
import { analytics } from '../lib/analytics';

const PAYPAL_CLIENT_ID = "BAAGH9vviiSc0ZUHX1Zp1QX-VKI9-CLsGBCiZKif6Aj-jXwyraUkDeQVgf6ntdbN2dYgywFor7M0K5LxYQ";

const Checkout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Extract plan from URL (e.g. ?plan=professional)
  const searchParams = new URLSearchParams(location.search);
  const plan = searchParams.get('plan') || 'professional';

  // Details for the Professional Plan
  const planDetails = {
    name: 'Professional Plan',
    price: '149.00',
    description: 'Full operational automation for growing businesses.',
    features: [
      'Up to 25 Users',
      'Unlimited Workflows',
      '2,500 Mari AI Credits / mo',
      'Industry Module Plugins Access'
    ]
  };

  useEffect(() => {
    // If somehow they got here for enterprise, redirect to contact or handle it
    if (plan === 'enterprise') {
      navigate('/contact');
    }
  }, [plan, navigate]);

  const handleApprove = (data, actions) => {
    setLoading(true);
    return actions.order.capture().then((details) => {
      // Payment successful
      analytics.trackConversion('payment_successful', {
        planId: plan,
        orderId: data.orderID,
        payerName: details.payer.name.given_name
      });
      
      setLoading(false);
      // Redirect to onboarding after successful payment
      navigate('/onboarding');
    }).catch(err => {
      console.error("PayPal Capture Error:", err);
      setError("There was an issue processing your payment. Please try again.");
      setLoading(false);
    });
  };

  const handleError = (err) => {
    console.error("PayPal SDK Error:", err);
    setError("Failed to load PayPal. Please refresh the page or try again later.");
  };

  return (
    <div className="min-h-screen bg-[#1c1c1c] text-white pt-28 pb-20 px-6 lg:px-12 flex flex-col justify-center">
      <SEO title="Secure Checkout | Ralion" description="Complete your purchase securely via PayPal." />

      <div className="max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-10">
        
        {/* Left Column: Plan Summary */}
        <div className="flex flex-col">
          <button 
            onClick={() => navigate('/pricing')}
            className="flex items-center gap-2 text-white/50 hover:text-brand-gold text-sm font-semibold transition-colors mb-8 w-fit"
          >
            <ArrowLeft size={16} /> Back to Pricing
          </button>

          <div className="bg-[#252525] border border-white/10 rounded-3xl p-8 h-full shadow-2xl">
            <h1 className="text-3xl font-extrabold text-white mb-2">Order Summary</h1>
            <p className="text-white/60 text-sm mb-8">You are upgrading to the {planDetails.name}.</p>

            <div className="border-t border-b border-white/10 py-6 mb-8 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-brand-gold">{planDetails.name}</h3>
                <p className="text-white/50 text-xs mt-1">Monthly Subscription</p>
              </div>
              <div className="text-right">
                <span className="text-3xl font-extrabold text-white">${planDetails.price}</span>
                <span className="text-white/40 text-xs block">/ mo</span>
              </div>
            </div>

            <h4 className="text-white font-bold text-sm mb-4">What's included:</h4>
            <div className="space-y-3 mb-8">
              {planDetails.features.map((feat, idx) => (
                <div key={idx} className="flex items-center gap-3 text-sm text-white/80">
                  <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            <div className="mt-auto bg-black/40 rounded-2xl p-4 flex items-start gap-3">
              <ShieldCheck size={24} className="text-brand-gold shrink-0 mt-0.5" />
              <p className="text-xs text-white/60 leading-relaxed">
                <strong className="text-white block mb-0.5">Secure Transaction</strong>
                Your payment is processed securely by PayPal. We do not store your credit card information on our servers.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Payment Form */}
        <div className="flex flex-col justify-center">
          <div className="bg-[#252525] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <h2 className="text-2xl font-bold text-white mb-6">Payment Details</h2>
            
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 text-red-400 text-sm font-semibold">
                {error}
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 z-10 bg-[#252525]/80 backdrop-blur-sm flex flex-col items-center justify-center">
                <Loader2 size={32} className="text-brand-gold animate-spin mb-4" />
                <p className="text-brand-gold font-bold text-sm">Processing Payment...</p>
              </div>
            )}

            <div className="min-h-[250px]">
              <PayPalScriptProvider options={{ clientId: PAYPAL_CLIENT_ID, components: "buttons", currency: "USD", intent: "capture" }}>
                <PayPalButtons
                  style={{
                    layout: "vertical",
                    shape: "rect",
                    color: "gold",
                    label: "checkout",
                  }}
                  createOrder={(data, actions) => {
                    return actions.order.create({
                      intent: 'CAPTURE',
                      purchase_units: [
                        {
                          description: `${planDetails.name} Subscription`,
                          amount: {
                            currency_code: 'USD',
                            value: planDetails.price,
                          },
                        },
                      ],
                    });
                  }}
                  onApprove={handleApprove}
                  onError={handleError}
                />
              </PayPalScriptProvider>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Checkout;
