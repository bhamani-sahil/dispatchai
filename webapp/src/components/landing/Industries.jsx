import { motion } from "framer-motion";
import {
  Wrench, Flame, Sparkles, Dog, Trash2, Home, TreePine, Bug,
  Zap, Hammer, Truck, DoorOpen, Car, Droplets, KeyRound, Settings, PaintBucket, Scissors
} from "lucide-react";

const industries = [
  { name: "Plumbing", icon: Wrench },
  { name: "HVAC", icon: Flame },
  { name: "Car Detailing", icon: Sparkles },
  { name: "Pet Grooming", icon: Dog },
  { name: "Carpet Cleaning", icon: PaintBucket },
  { name: "Junk Removal", icon: Trash2 },
  { name: "House Cleaning", icon: Home },
  { name: "Landscaping", icon: TreePine },
  { name: "Pest Control", icon: Bug },
  { name: "Electrical", icon: Zap },
  { name: "Handyman", icon: Hammer },
  { name: "Moving Services", icon: Truck },
  { name: "Garage Door", icon: DoorOpen },
  { name: "Car Repair", icon: Car },
  { name: "Pressure Washing", icon: Droplets },
  { name: "Locksmith", icon: KeyRound },
  { name: "Appliance Repair", icon: Settings },
  { name: "Door Repair", icon: Scissors },
];

const row1 = industries.slice(0, 9);
const row2 = industries.slice(9);

function MarqueeRow({ items, direction = "left", speed = 30 }) {
  const doubled = [...items, ...items];
  return (
    <div className="relative overflow-hidden">
      <motion.div
        className="flex gap-3 w-max"
        animate={{ x: direction === "left" ? [0, -(items.length * 180)] : [-(items.length * 180), 0] }}
        transition={{ duration: speed, repeat: Infinity, ease: "linear" }}
      >
        {doubled.map((item, i) => {
          const Icon = item.icon;
          return (
            <div
              key={`${item.name}-${i}`}
              className="flex items-center gap-2.5 px-5 py-3 rounded-xl border border-black/[0.04] bg-white/70 backdrop-blur-sm shrink-0 group hover:border-[#9775FA]/20 hover:bg-white/90 transition-all duration-300 cursor-default"
              style={{ minWidth: "165px" }}
            >
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#4F6EF7]/[0.06] group-hover:bg-[#4F6EF7]/[0.1] transition-colors">
                <Icon className="w-4 h-4 text-[#4F6EF7]" strokeWidth={1.5} />
              </div>
              <span className="text-sm font-medium text-[#0F172A] whitespace-nowrap">{item.name}</span>
            </div>
          );
        })}
      </motion.div>
    </div>
  );
}

export default function Industries() {
  return (
    <section data-testid="industries-section" className="relative py-20 md:py-28 overflow-hidden">
      <div className="ambient-glow ambient-glow-purple w-[600px] h-[400px] top-0 left-1/4" />
      <div className="ambient-glow ambient-glow-blue w-[400px] h-[400px] bottom-0 right-1/4" />

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 mb-12 md:mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <span className="text-xs font-semibold tracking-widest uppercase text-[#9775FA] mb-4 block">
            Built For Your Industry
          </span>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl tracking-tight font-medium gradient-text mb-4"
            style={{ fontFamily: "'Outfit', sans-serif" }}
          >
            Works for every trade
          </h2>
          <p className="text-base text-[#475569] max-w-lg mx-auto">
            From plumbers to pet groomers — if you miss calls, CueDesk handles them. No industry-specific setup needed.
          </p>
        </motion.div>
      </div>

      {/* Marquee rows */}
      <div className="space-y-3">
        <MarqueeRow items={row1} direction="left" speed={35} />
        <MarqueeRow items={row2} direction="right" speed={40} />
      </div>
    </section>
  );
}
