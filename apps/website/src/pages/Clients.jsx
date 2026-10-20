import React, { useState, useEffect } from 'react';
import SEO from '../components/common/SEO';
import { getPublishedClients } from '../lib/clientsService';
import { Sparkles, Calendar, ShieldCheck, AlertCircle, RefreshCw } from 'lucide-react';

const Clients = () => {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [failedLogos, setFailedLogos] = useState(new Set());

  const loadClients = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPublishedClients();
      setClients(data || []);
    } catch (err) {
      console.error('Failed to load published clients:', err);
      // Strictly surface database connection problems; never silently treat as empty
      setError(err.message || 'Database connection error: Unable to load client portfolio at this time.');
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClients();
  }, []);

  const handleImageError = (clientId) => {
    // Strictly do NOT substitute the Ras Ali Labs logo when a client logo fails to load.
    // Track failed logos to avoid displaying broken or misleading imagery.
    setFailedLogos((prev) => new Set([...prev, clientId]));
  };

  return (
    <div className="pt-28 pb-24 bg-[#121212] text-white min-h-screen">
      <SEO
        title="Our Clients | Ras Ali Labs"
        description="Explore verified client organizations Ras Ali Labs has partnered with across media production, enterprise software, and digital platform engineering."
        keywords="Ras Ali Labs clients, Botswana software clients, film production clients, enterprise technology partners Botswana"
        canonical="https://rasalilabs.com/clients"
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Header Section */}
        <div className="max-w-3xl mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand-gold/10 border border-brand-gold/25 text-brand-gold text-xs font-bold uppercase tracking-wider mb-5">
            <Sparkles size={14} /> Proven Relationships
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white mb-4 leading-tight">
            Our Clients
          </h1>
          <p className="text-xl md:text-2xl text-white/70 font-light tracking-wide">
            Trusted relationships. Meaningful work.
          </p>
          <div className="w-16 h-1 bg-brand-gold mt-6 rounded-full"></div>
        </div>

        {/* Loading State */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div
                key={i}
                className="bg-[#181818] border border-white/10 rounded-3xl p-8 flex flex-col items-center justify-between h-72 animate-pulse"
              >
                <div className="w-36 h-24 bg-white/5 rounded-2xl"></div>
                <div className="w-20 h-5 bg-white/5 rounded-full"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          /* Fail-Closed Database Error State: Clearly reported rather than silently treated as empty */
          <div className="bg-red-500/10 border border-red-500/25 rounded-3xl p-10 text-center max-w-xl mx-auto my-12 shadow-xl">
            <AlertCircle className="mx-auto text-red-400 mb-4" size={36} />
            <h2 className="text-xl font-bold text-white mb-2">Portfolio Database Error</h2>
            <p className="text-white/60 text-sm mb-6 leading-relaxed font-mono text-xs">{error}</p>
            <button
              onClick={loadClients}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
            >
              <RefreshCw size={14} /> Retry Connection
            </button>
          </div>
        ) : clients.length === 0 ? (
          /* Legitimate Empty / Scheduled Verification State (DB reachable, but 0 published clients) */
          <div className="bg-[#181818] border border-white/10 rounded-3xl p-12 text-center max-w-xl mx-auto my-12">
            <ShieldCheck className="mx-auto text-brand-gold/70 mb-4" size={40} />
            <h2 className="text-xl font-bold text-white mb-2">Client Portfolio Verification</h2>
            <p className="text-white/60 text-sm leading-relaxed">
              Client records and logo usage authorizations are currently undergoing scheduled administrative review.
              Verified partner entries will be published here upon administrative signoff.
            </p>
          </div>
        ) : (
          /* Public Client Cards: STRICTLY displays ONLY official logo and verified year label */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
            {clients.map((client) => {
              const hasFailed = failedLogos.has(client.id);

              return (
                <div
                  key={client.id}
                  className="group relative bg-[#181818] hover:bg-[#1f1f1f] border border-white/10 hover:border-brand-gold/50 rounded-3xl p-8 flex flex-col items-center justify-between h-72 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-brand-gold/5 transform hover:-translate-y-1.5"
                >
                  {/* Logo Display Canvas: strictly preserves logo aspect ratio with object-contain */}
                  <div className="w-full flex-1 flex items-center justify-center p-4">
                    <div className="w-full h-32 flex items-center justify-center rounded-2xl bg-black/20 p-3 group-hover:bg-black/30 transition-colors">
                      {hasFailed ? (
                        <div className="text-center px-2">
                          <p className="text-xs font-medium text-white/50 tracking-wide uppercase">
                            {client.name}
                          </p>
                          <span className="text-[10px] text-white/30 font-mono block mt-1">
                            [Logo asset unavailable]
                          </span>
                        </div>
                      ) : (
                        <img
                          src={client.logo_url}
                          alt={`${client.name} Official Logo`}
                          loading="lazy"
                          className="max-h-24 max-w-full object-contain filter grayscale group-hover:grayscale-0 transition-all duration-300 drop-shadow-md"
                          onError={() => handleImageError(client.id)}
                        />
                      )}
                    </div>
                  </div>

                  {/* Verified Year / Year Range beneath logo */}
                  <div className="pt-4 border-t border-white/10 w-full flex items-center justify-center">
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase text-white/70 group-hover:text-brand-gold transition-colors font-mono">
                      <Calendar size={13} className="text-brand-gold/70 group-hover:text-brand-gold" />
                      {client.work_year}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Verification & Trust Footnote */}
        <div className="mt-20 pt-10 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-white/50">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-emerald-400" />
            <span>All corporate client logos and engagement dates are verified by Ras Ali Labs (Pty) Ltd.</span>
          </div>
          <span className="text-white/40">Gaborone, Botswana</span>
        </div>
      </div>
    </div>
  );
};

export default Clients;
