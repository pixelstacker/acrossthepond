import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import * as Icons from 'lucide-react';
import { 
  MapPin, 
  Coffee, 
  Sun, 
  Utensils, 
  Moon, 
  Home, 
  Car, 
  Info, 
  Clock,
  Compass,
  Crown,
  ExternalLink,
  Plane,
  RotateCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { fetchItinerary } from './services/itineraryService';
import { DayItinerary } from './types';

// Component to render text with clickable URLs and detected addresses
function ContentRenderer({ content }: { content: string }) {
  if (!content) return null;

  // Regex for UK postcodes and common street address patterns
  const addressRegex = /((?:\d+\s+[A-Z][a-zA-Z\s,]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct|Circle|Cir|Way|Place|Pl|Square|Sq|Trail|Trl|Parkway|Pkwy|Plaza|Plz|Terrace|Ter|Highway|Hwy))|(?:[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}))/gi;
  
  // Linkify addresses that aren't already part of a markdown link
  const processedContent = content.replace(addressRegex, (match, p1, offset) => {
    const before = content.slice(Math.max(0, offset - 2), offset);
    const after = content.slice(offset + match.length, offset + match.length + 1);
    if (before === "](" || after === ")") return match;
    
    // Use a universal Google Maps link that works well on mobile and web
    return `[${match}](https://maps.google.com/?q=${encodeURIComponent(match)})`;
  });

  return (
    <div className="markdown-body">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => (
            <a 
              {...props} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-gold hover:underline inline-flex items-center gap-1"
            >
              {props.children}
              <ExternalLink className="w-3 h-3" />
            </a>
          )
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}

// Helper to render a Lucide icon by name
function DynamicIcon({ name, className }: { name: string, className?: string }) {
  // Try to find the icon by name (case-insensitive search)
  const iconKey = Object.keys(Icons).find(
    key => key.toLowerCase() === name.toLowerCase()
  );
  
  // @ts-ignore - Dynamic access to icons
  const IconComponent = (iconKey ? Icons[iconKey] : null) || Icons.Crown;
  return <IconComponent className={className} />;
}

export default function App() {
  const [itinerary, setItinerary] = useState<DayItinerary[]>([]);
  const [appTitle, setAppTitle] = useState('Across the Pond');
  const [appIcon, setAppIcon] = useState('Crown');
  const [loading, setLoading] = useState(true);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [refreshSeeds, setRefreshSeeds] = useState<Record<number, number>>({});
  
  const navRef = useRef<HTMLDivElement>(null);
  const dayRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    async function loadData() {
      const data = await fetchItinerary();
      setItinerary(data.days);
      setAppTitle(data.title);
      if (data.icon) setAppIcon(data.icon);
      
      // Apply custom colors if provided
      if (data.colors) {
        const root = document.documentElement;
        if (data.colors.navy) root.style.setProperty('--navy', data.colors.navy);
        if (data.colors.gold) root.style.setProperty('--gold', data.colors.gold);
        if (data.colors.cream) root.style.setProperty('--cream', data.colors.cream);
      }
      
      // Auto-select current day
      if (data.days.length > 0) {
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }).toLowerCase();
        
        // Try to find exact match (e.g., "Mar 8")
        let index = data.days.findIndex(d => d.date.toLowerCase().includes(todayStr));
        
        // If no exact match, find the nearest day
        if (index === -1) {
          const todayTime = now.getTime();
          let closestIndex = 0;
          let minDiff = Infinity;
          
          data.days.forEach((d, i) => {
            // Attempt to parse the date string (assuming format like "Mar 8, 2026" or similar)
            // If it's just "Mar 8", we append the current year
            const dateToParse = d.date.includes('202') ? d.date : `${d.date}, ${now.getFullYear()}`;
            const dayTime = new Date(dateToParse).getTime();
            
            if (!isNaN(dayTime)) {
              const diff = Math.abs(todayTime - dayTime);
              if (diff < minDiff) {
                minDiff = diff;
                closestIndex = i;
              }
            }
          });
          index = closestIndex;
        }
        
        setSelectedDayIndex(index);
      }
      
      setLoading(false);
    }
    loadData();
  }, []);

  // Scroll active pill into view
  useEffect(() => {
    const activeElement = dayRefs.current[selectedDayIndex];
    const container = navRef.current;
    
    if (activeElement && container) {
      const containerWidth = container.offsetWidth;
      const elementOffset = activeElement.offsetLeft;
      const elementWidth = activeElement.offsetWidth;
      
      const scrollPosition = elementOffset - (containerWidth / 2) + (elementWidth / 2);
      
      container.scrollTo({
        left: scrollPosition,
        behavior: 'smooth'
      });
    }
  }, [selectedDayIndex, loading]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Compass className="w-12 h-12 text-navy" />
        </motion.div>
      </div>
    );
  }

  const currentDay = itinerary[selectedDayIndex];
  
  if (!currentDay && !loading) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center p-8 text-center">
        <Compass className="w-16 h-16 text-navy mb-4 opacity-20" />
        <h2 className="text-2xl font-display text-navy mb-2">Itinerary Not Found</h2>
        <p className="text-navy/60 max-w-md">
          We couldn't load the itinerary data. Please check your connection or the Google Sheet configuration.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-2 bg-navy text-cream rounded-full hover:bg-gold hover:text-navy transition-all"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Helper to get a real themed image
  const getImageUrl = (day: DayItinerary, index: number) => {
    if (!day) return '';
    // 1. Use user-provided image if it exists
    if (day.image && day.image.startsWith('http')) {
      return day.image;
    }

    // 2. Build search keywords based on location and activities
    const loc = day.location.toLowerCase();
    const activities = `${day.morning} ${day.afternoon} ${day.evening}`.toLowerCase();
    
    let keywords = 'landscape,nature';
    
    if (loc.includes('london')) keywords = 'london,architecture,cityscape';
    else if (loc.includes('moose') || loc.includes('wy') || loc.includes('teton')) keywords = 'grand-teton,mountain,landscape,nature';
    else if (loc.includes('bath')) keywords = 'bath-uk,architecture,street';
    else if (loc.includes('edinburgh')) keywords = 'edinburgh,castle,landscape';
    else if (loc.includes('scotland')) keywords = 'scotland,highlands,nature';
    else if (loc.includes('oxford')) keywords = 'oxford-university,architecture';
    else if (loc.includes('stonehenge')) keywords = 'stonehenge,landscape';
    else if (activities.includes('flight') || activities.includes('plane') || loc.includes('lax')) keywords = 'airplane,wing,sky';
    else if (activities.includes('train')) keywords = 'train,tracks,landscape';
    else if (activities.includes('castle')) keywords = 'british,castle,architecture';
    else if (activities.includes('pub')) keywords = 'english,pub,exterior,architecture';
    else if (activities.includes('museum')) keywords = 'museum,building,architecture';
    else {
      // Fallback to the city name itself with landscape bias
      keywords = `${loc.split(',')[0].trim().replace(/\s+/g, '-')},landscape,architecture`;
    }
    
    // Use loremflickr for actual keyword-based images
    // The 'lock' parameter ensures the same image is returned for the same day
    // We add the refresh seed to allow changing the image
    const seed = (refreshSeeds[index] || 0) + index + 10;
    return `https://loremflickr.com/800/600/${keywords}/all?lock=${seed}`;
  };

  const handleRefreshImage = () => {
    setRefreshSeeds(prev => ({
      ...prev,
      [selectedDayIndex]: (prev[selectedDayIndex] || 0) + 1
    }));
  };

  return (
    <div className="min-h-screen bg-cream text-navy font-serif selection:bg-gold selection:text-navy">
      {/* Compact Header */}
      <header className="bg-navy text-cream py-4 px-6 border-b-2 border-gold sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DynamicIcon name={appIcon} className="w-6 h-6 text-gold" />
            <h1 className="font-display text-xl md:text-2xl tracking-widest uppercase">
              {appTitle}
            </h1>
          </div>
          <div className="hidden sm:block text-right">
            <p className="text-[10px] uppercase tracking-[0.3em] font-sans font-bold opacity-70">Spring 2026</p>
            <p className="text-xs italic font-serif">United Kingdom & Beyond</p>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Compact Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Location Card */}
          <motion.div 
            key={`left-${selectedDayIndex}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-5 space-y-6"
          >
            <div className="bg-white rounded-2xl overflow-hidden shadow-xl border border-navy/5 flex flex-col">
              {/* Header Image */}
              <div className="h-48 md:h-64 relative group overflow-hidden">
                <img 
                  src={getImageUrl(currentDay, selectedDayIndex)}
                  alt={currentDay.location}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-navy/80 via-transparent to-transparent" />
                
                {/* Refresh Button - Lower Right Corner */}
                {!currentDay.image && (
                  <button 
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleRefreshImage();
                    }}
                    className="absolute bottom-4 right-4 p-1.5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-md text-white/60 hover:text-gold hover:bg-white/20 transition-all duration-300 z-10"
                    title="Refresh Image"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Quick Navigation Arrows */}
                <div className="absolute top-1/2 -translate-y-1/2 left-0 right-0 flex justify-between px-2 pointer-events-none">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedDayIndex > 0) setSelectedDayIndex(selectedDayIndex - 1);
                    }}
                    className={`p-2 rounded-full bg-black/20 backdrop-blur-sm text-white transition-all pointer-events-auto ${selectedDayIndex === 0 ? 'opacity-0 cursor-default' : 'opacity-0 group-hover:opacity-100 hover:bg-black/40'}`}
                    disabled={selectedDayIndex === 0}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (selectedDayIndex < itinerary.length - 1) setSelectedDayIndex(selectedDayIndex + 1);
                    }}
                    className={`p-2 rounded-full bg-black/20 backdrop-blur-sm text-white transition-all pointer-events-auto ${selectedDayIndex === itinerary.length - 1 ? 'opacity-0 cursor-default' : 'opacity-0 group-hover:opacity-100 hover:bg-black/40'}`}
                    disabled={selectedDayIndex === itinerary.length - 1}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                <div className="absolute bottom-4 left-6 right-6 text-cream pointer-events-none">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-gold" />
                    <span className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-gold">{currentDay.dayOfWeek} • {currentDay.date}</span>
                  </div>
                  <a 
                    href={`https://maps.google.com/?q=${encodeURIComponent(currentDay.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/loc inline-block"
                  >
                    <h2 className="text-2xl md:text-3xl font-display tracking-tight leading-tight group-hover/loc:text-gold transition-colors flex items-center gap-2">
                      {currentDay.location}
                      <ExternalLink className="w-4 h-4 opacity-0 group-hover/loc:opacity-100 transition-opacity" />
                    </h2>
                  </a>
                  {currentDay.travelFromTo && (
                    <div className="flex items-center gap-2 mt-1 opacity-80">
                      <Plane className="w-3 h-3 text-gold" />
                      <span className="text-xs italic font-serif">{currentDay.travelFromTo}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-navy/60">
                      <Home className="w-4 h-4" />
                      <span className="text-xs font-sans font-bold uppercase tracking-widest">Stay</span>
                    </div>
                    <div className="text-sm md:text-base leading-relaxed font-medium">
                      <ContentRenderer content={currentDay.stay || 'N/A'} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-navy/60">
                      <Car className="w-4 h-4" />
                      <span className="text-xs font-sans font-bold uppercase tracking-widest">Transport</span>
                    </div>
                    <div className="text-sm md:text-base leading-relaxed font-medium">
                      <ContentRenderer content={currentDay.transport || 'N/A'} />
                    </div>
                  </div>
                </div>

                {currentDay.extras && (
                  <div className="pt-6 border-t border-navy/5">
                    <div className="flex items-center gap-2 mb-3 text-gold">
                      <Info className="w-4 h-4" />
                      <span className="text-xs font-sans font-bold uppercase tracking-widest">Notes</span>
                    </div>
                    <div className="text-sm md:text-base italic leading-relaxed text-navy/80">
                      <ContentRenderer content={currentDay.extras} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right Column: Schedule Grid */}
          <motion.div 
            key={`right-${selectedDayIndex}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-7"
          >
            <div className="bg-white rounded-2xl p-6 md:p-8 shadow-xl border border-navy/5">
              <div className="flex items-center justify-between mb-8 border-b border-navy/5 pb-6">
                <h3 className="font-display text-xl md:text-2xl tracking-widest uppercase">Daily Schedule</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
                {[
                  { icon: Coffee, label: 'Breakfast', content: currentDay.breakfast },
                  { icon: Sun, label: 'Morning', content: currentDay.morning },
                  { icon: Utensils, label: 'Lunch', content: currentDay.lunch },
                  { icon: Clock, label: 'Afternoon', content: currentDay.afternoon },
                  { icon: Utensils, label: 'Dinner', content: currentDay.dinner },
                  { icon: Moon, label: 'Evening', content: currentDay.evening },
                ].map((item, idx) => item.content ? (
                  <div key={idx} className="flex gap-5 group">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cream border border-gold/30 flex items-center justify-center group-hover:bg-navy group-hover:text-gold transition-all duration-300">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-[11px] font-sans font-black uppercase tracking-[0.2em] text-gold mb-2">
                        {item.label}
                      </span>
                      <div className="text-base md:text-lg leading-snug text-navy/90 font-medium">
                        <ContentRenderer content={item.content} />
                      </div>
                    </div>
                  </div>
                ) : null)}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Visual Day Navigator */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
          <div 
            ref={navRef}
            className="bg-navy/90 backdrop-blur-xl border border-gold/30 rounded-full p-1.5 shadow-2xl flex items-center gap-1 overflow-x-auto scrollbar-hide scroll-smooth"
          >
            {itinerary.map((day, idx) => (
              <button
                key={idx}
                ref={el => { dayRefs.current[idx] = el; }}
                onClick={() => setSelectedDayIndex(idx)}
                className={`flex-shrink-0 px-4 py-2 rounded-full transition-all duration-300 ${
                  selectedDayIndex === idx 
                    ? 'bg-gold text-navy shadow-lg scale-105' 
                    : 'text-cream/60 hover:text-cream hover:bg-white/10'
                }`}
              >
                <div className="flex flex-col items-center">
                  <span className="text-[10px] font-sans font-black uppercase tracking-tighter leading-none mb-0.5">
                    {day.dayOfWeek.slice(0, 3)}
                  </span>
                  <span className="text-xs font-display font-bold leading-none">
                    {day.date.split(',')[0]}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </main>
      
      <footer className="py-12 text-center text-navy/40 text-[10px] font-sans font-bold uppercase tracking-[0.4em]">
        By Appointment to the Traveller — {new Date().getFullYear()}
      </footer>
    </div>
  );
}
