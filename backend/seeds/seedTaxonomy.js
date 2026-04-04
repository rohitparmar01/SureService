/**
 * SEED SCRIPT: Populate Taxonomy (Categories, Subcategories, Services)
 * Run: node seeds/seedTaxonomy.js
 * 
 * Focus: B2B Enterprise Services
 * - Air Conditioning (HVAC) Services
 * - CCTV & Electronic Security Systems
 * - IT Hardware & Computer Services
 * - Electrical & Power Services
 * - Plumbing & Sanitation Services
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Taxonomy = require('../models/Taxonomy');

const DB_URL = process.env.MONGODB_URI || 'mongodb://localhost:27017/sureservice';

// Taxonomy data structure - Business/Enterprise Services Only
const taxonomyData = [
  // ============================================
  // CATEGORY 1: AIR CONDITIONING (HVAC) SERVICES
  // ============================================
  {
    type: 'category',
    taxonomyId: 'air-conditioning-hvac',
    name: 'Air Conditioning (HVAC) Services',
    description: 'Professional AC, HVAC installation, repair, and maintenance for residential and commercial spaces',
    icon: '❄️',
    sortOrder: 1
  },
  // Subcategories
  {
    type: 'subcategory',
    taxonomyId: 'ac-installation',
    name: 'AC Installation',
    description: 'Air conditioning system installation for homes and offices',
    parentId: 'air-conditioning-hvac',
    icon: '🔧',
    sortOrder: 1,
    keywords: ['installation', 'ac', 'air conditioner', 'new', 'setup']
  },
  {
    type: 'subcategory',
    taxonomyId: 'ac-repair-maintenance',
    name: 'AC Repair & Maintenance',
    description: 'AC repair, troubleshooting, and regular maintenance service',
    parentId: 'air-conditioning-hvac',
    icon: '🔨',
    sortOrder: 2,
    keywords: ['repair', 'service', 'maintenance', 'fix', 'troubleshoot']
  },
  {
    type: 'subcategory',
    taxonomyId: 'gas-refilling-charging',
    name: 'Gas Refilling & Charging',
    description: 'AC gas refill, refrigerant charging, and coolant services',
    parentId: 'air-conditioning-hvac',
    icon: '⚙️',
    sortOrder: 3,
    keywords: ['gas', 'refill', 'charging', 'coolant', 'refrigerant', 'top-up']
  },
  {
    type: 'subcategory',
    taxonomyId: 'ac-amc-contracts',
    name: 'AMC & Service Contracts',
    description: 'Annual maintenance contracts and service plans for AC systems',
    parentId: 'air-conditioning-hvac',
    icon: '📅',
    sortOrder: 4,
    keywords: ['amc', 'maintenance', 'contract', 'annual', 'service plan']
  },
  {
    type: 'subcategory',
    taxonomyId: 'hvac-systems',
    name: 'HVAC Systems',
    description: 'Heating, ventilation, and air conditioning system installation and maintenance',
    parentId: 'air-conditioning-hvac',
    icon: '🌡️',
    sortOrder: 5,
    keywords: ['hvac', 'heating', 'ventilation', 'cooling', 'system']
  },
  // Services
  {
    type: 'service',
    taxonomyId: 'split-ac-install',
    name: 'Split AC Installation',
    description: 'Split air conditioner installation with indoor and outdoor units',
    parentId: 'ac-installation',
    icon: '❄️',
    keywords: ['split ac', 'installation', 'indoor unit', 'outdoor unit']
  },
  {
    type: 'service',
    taxonomyId: 'window-ac-install',
    name: 'Window AC Installation',
    description: 'Window-mounted air conditioner installation',
    parentId: 'ac-installation',
    icon: '🪟',
    keywords: ['window ac', 'installation', 'setup']
  },
  {
    type: 'service',
    taxonomyId: 'central-ac-install',
    name: 'Central AC Installation',
    description: 'Central air conditioning system installation for large spaces',
    parentId: 'ac-installation',
    icon: '🏢',
    keywords: ['central ac', 'commercial', 'large space', 'building']
  },
  {
    type: 'service',
    taxonomyId: 'ac-compressor-repair',
    name: 'Compressor Repair & Replacement',
    description: 'AC compressor repair, replacement, and testing',
    parentId: 'ac-repair-maintenance',
    icon: '🔧',
    keywords: ['compressor', 'repair', 'replacement', 'engine']
  },
  {
    type: 'service',
    taxonomyId: 'cooler-fan-replacement',
    name: 'Cooler & Fan Replacement',
    description: 'Evaporator cooler and fan replacement service',
    parentId: 'ac-repair-maintenance',
    icon: '🌀',
    keywords: ['fan', 'cooler', 'replacement', 'blower']
  },
  {
    type: 'service',
    taxonomyId: 'ac-filter-cleaning',
    name: 'AC Filter Cleaning',
    description: 'Professional AC filter cleaning and replacement',
    parentId: 'ac-repair-maintenance',
    icon: '🧹',
    keywords: ['filter', 'cleaning', 'air', 'maintenance']
  },
  {
    type: 'service',
    taxonomyId: 'ac-gas-refill',
    name: 'Gas Refill Service',
    description: 'AC refrigerant refill and charging with pressure testing',
    parentId: 'gas-refilling-charging',
    icon: '⚙️',
    keywords: ['gas', 'refill', 'coolant', 'refrigerant', 'charging']
  },
  {
    type: 'service',
    taxonomyId: 'ac-cleaning-service',
    name: 'AC Unit Deep Cleaning',
    description: 'Complete AC unit cleaning including coils and condensers',
    parentId: 'ac-repair-maintenance',
    icon: '✨',
    keywords: ['cleaning', 'deep clean', 'coil', 'condenser']
  },

  // ============================================
  // CATEGORY 2: CCTV & ELECTRONIC SECURITY SYSTEMS
  // ============================================
  {
    type: 'category',
    taxonomyId: 'cctv-security',
    name: 'CCTV & Electronic Security Systems',
    description: 'CCTV cameras, security systems, access control, alarm systems, and surveillance',
    icon: '📹',
    sortOrder: 2
  },
  // Subcategories
  {
    type: 'subcategory',
    taxonomyId: 'cctv-installation',
    name: 'CCTV Installation & Setup',
    description: 'Professional CCTV camera system installation and configuration',
    parentId: 'cctv-security',
    icon: '📹',
    sortOrder: 1,
    keywords: ['cctv', 'camera', 'installation', 'surveillance', 'setup']
  },
  {
    type: 'subcategory',
    taxonomyId: 'access-control-systems',
    name: 'Access Control Systems',
    description: 'Electronic door locks, card readers, biometric access control',
    parentId: 'cctv-security',
    icon: '🔐',
    sortOrder: 2,
    keywords: ['access', 'control', 'lock', 'door', 'biometric', 'card reader']
  },
  {
    type: 'subcategory',
    taxonomyId: 'alarm-systems',
    name: 'Alarm Systems',
    description: 'Burglar alarms, motion sensors, intrusion detection systems',
    parentId: 'cctv-security',
    icon: '🚨',
    sortOrder: 3,
    keywords: ['alarm', 'security', 'burglar', 'alert', 'motion', 'intrusion']
  },
  {
    type: 'subcategory',
    taxonomyId: 'surveillance-monitoring',
    name: 'Surveillance & Monitoring',
    description: '24/7 surveillance monitoring and control center services',
    parentId: 'cctv-security',
    icon: '👁️',
    sortOrder: 4,
    keywords: ['surveillance', 'monitoring', 'control', 'watch', 'center']
  },
  {
    type: 'subcategory',
    taxonomyId: 'security-maintenance',
    name: 'Security System Maintenance',
    description: 'Maintenance, support, and system upgrades',
    parentId: 'cctv-security',
    icon: '🔧',
    sortOrder: 5,
    keywords: ['maintenance', 'support', 'upgrade', 'repair']
  },
  // Services
  {
    type: 'service',
    taxonomyId: 'hd-cctv-install',
    name: 'HD CCTV Installation',
    description: 'High definition CCTV camera system setup and wiring',
    parentId: 'cctv-installation',
    icon: '📹',
    keywords: ['hd', 'cctv', 'camera', 'installation', 'high definition']
  },
  {
    type: 'service',
    taxonomyId: 'ip-camera-system',
    name: 'IP Camera System Installation',
    description: 'Network IP camera installation with remote access',
    parentId: 'cctv-installation',
    icon: '📡',
    keywords: ['ip camera', 'network', 'remote', 'wireless']
  },
  {
    type: 'service',
    taxonomyId: 'dvr-nvr-setup',
    name: 'DVR/NVR Setup & Configuration',
    description: 'Digital/Network video recorder setup and configuration',
    parentId: 'cctv-installation',
    icon: '📀',
    keywords: ['dvr', 'nvr', 'recorder', 'setup', 'storage']
  },
  {
    type: 'service',
    taxonomyId: 'card-reader-lock',
    name: 'Card Reader & Electronic Locks',
    description: 'RFID/IC card access control and electronic door lock installation',
    parentId: 'access-control-systems',
    icon: '🔐',
    keywords: ['card', 'reader', 'lock', 'electronic', 'rfid']
  },
  {
    type: 'service',
    taxonomyId: 'biometric-system',
    name: 'Biometric Access System',
    description: 'Fingerprint, face recognition, and iris scan access control',
    parentId: 'access-control-systems',
    icon: '👆',
    keywords: ['biometric', 'fingerprint', 'face', 'recognition', 'access']
  },
  {
    type: 'service',
    taxonomyId: 'motion-alarm',
    name: 'Motion Sensor Alarms',
    description: 'PIR motion sensor and alarm system installation',
    parentId: 'alarm-systems',
    icon: '🚨',
    keywords: ['motion', 'sensor', 'alarm', 'detection', 'pir']
  },
  {
    type: 'service',
    taxonomyId: 'door-window-sensor',
    name: 'Door & Window Sensors',
    description: 'Magnetic door/window sensors for intrusion detection',
    parentId: 'alarm-systems',
    icon: '🚪',
    keywords: ['door', 'window', 'sensor', 'alarm', 'detection']
  },
  {
    type: 'service',
    taxonomyId: 'remote-surveillance',
    name: 'Remote Surveillance Monitoring',
    description: '24/7 remote monitoring center with alert services',
    parentId: 'surveillance-monitoring',
    icon: '👁️',
    keywords: ['remote', 'monitoring', 'surveillance', 'alert', 'center']
  },

  // ============================================
  // CATEGORY 3: IT HARDWARE & COMPUTER SERVICES
  // ============================================
  {
    type: 'category',
    taxonomyId: 'it-hardware-computer',
    name: 'IT Hardware & Computer Services',
    description: 'Computer repair, server setup, networks, hardware upgrades, IT infrastructure',
    icon: '💻',
    sortOrder: 3
  },
  // Subcategories
  {
    type: 'subcategory',
    taxonomyId: 'laptop-desktop-repair',
    name: 'Laptop & Desktop Repair',
    description: 'Computer and laptop repair, troubleshooting, and component replacement',
    parentId: 'it-hardware-computer',
    icon: '🖥️',
    sortOrder: 1,
    keywords: ['laptop', 'desktop', 'repair', 'computer', 'pc']
  },
  {
    type: 'subcategory',
    taxonomyId: 'server-setup',
    name: 'Server Setup & Management',
    description: 'Server installation, configuration, and ongoing management',
    parentId: 'it-hardware-computer',
    icon: '🖨️',
    sortOrder: 2,
    keywords: ['server', 'setup', 'management', 'infrastructure', 'rack']
  },
  {
    type: 'subcategory',
    taxonomyId: 'networking-services',
    name: 'Networking Services',
    description: 'LAN/WAN setup, network cabling, WiFi, routers, switches',
    parentId: 'it-hardware-computer',
    icon: '🌐',
    sortOrder: 3,
    keywords: ['network', 'lan', 'connectivity', 'wan', 'wifi']
  },
  {
    type: 'subcategory',
    taxonomyId: 'hardware-upgrades',
    name: 'Hardware Upgrades & Installation',
    description: 'RAM, SSD, HDD, graphics card, and component upgrades',
    parentId: 'it-hardware-computer',
    icon: '⚡',
    sortOrder: 4,
    keywords: ['upgrade', 'hardware', 'ram', 'ssd', 'storage']
  },
  {
    type: 'subcategory',
    taxonomyId: 'data-recovery',
    name: 'Data Recovery & Backup',
    description: 'Hard drive recovery, backup systems, and disaster recovery',
    parentId: 'it-hardware-computer',
    icon: '💾',
    sortOrder: 5,
    keywords: ['data', 'recovery', 'backup', 'restore', 'hard drive']
  },
  // Services
  {
    type: 'service',
    taxonomyId: 'laptop-screen-repair',
    name: 'Laptop Screen Repair',
    description: 'Laptop LCD/LED screen replacement and repair',
    parentId: 'laptop-desktop-repair',
    icon: '🖥️',
    keywords: ['screen', 'display', 'laptop', 'repair', 'lcd']
  },
  {
    type: 'service',
    taxonomyId: 'motherboard-repair',
    name: 'Motherboard Repair',
    description: 'Computer motherboard repair, diagnostics, and replacement',
    parentId: 'laptop-desktop-repair',
    icon: '🔌',
    keywords: ['motherboard', 'repair', 'electronics', 'diagnostics']
  },
  {
    type: 'service',
    taxonomyId: 'hard-drive-repair',
    name: 'Hard Drive Repair & Recovery',
    description: 'Hard drive repair, data recovery, and replacement',
    parentId: 'data-recovery',
    icon: '💾',
    keywords: ['hard drive', 'repair', 'recovery', 'data', 'storage']
  },
  {
    type: 'service',
    taxonomyId: 'server-installation',
    name: 'Server Installation & Configuration',
    description: 'Physical server setup, OS installation, and initial configuration',
    parentId: 'server-setup',
    icon: '🖨️',
    keywords: ['server', 'installation', 'setup', 'hardware']
  },
  {
    type: 'service',
    taxonomyId: 'server-maintenance',
    name: 'Server Maintenance & Support',
    description: 'Ongoing server monitoring, updates, and technical support',
    parentId: 'server-setup',
    icon: '🔧',
    keywords: ['server', 'maintenance', 'support', 'monitoring']
  },
  {
    type: 'service',
    taxonomyId: 'network-installation',
    name: 'Network Installation & Cabling',
    description: 'LAN cabling, network switch setup, and infrastructure installation',
    parentId: 'networking-services',
    icon: '🌐',
    keywords: ['network', 'cabling', 'lan', 'installation', 'switch']
  },
  {
    type: 'service',
    taxonomyId: 'wifi-setup',
    name: 'WiFi Setup & Optimization',
    description: 'WiFi network installation, configuration, and optimization',
    parentId: 'networking-services',
    icon: '📶',
    keywords: ['wifi', 'wireless', 'network', 'setup', 'optimization']
  },
  {
    type: 'service',
    taxonomyId: 'ram-upgrade',
    name: 'RAM Upgrade & Installation',
    description: 'Computer RAM memory upgrade and installation',
    parentId: 'hardware-upgrades',
    icon: '⚡',
    keywords: ['ram', 'memory', 'upgrade', 'installation', 'ddr']
  },
  {
    type: 'service',
    taxonomyId: 'ssd-upgrade',
    name: 'SSD Installation',
    description: 'SSD (Solid State Drive) installation and migration',
    parentId: 'hardware-upgrades',
    icon: '💿',
    keywords: ['ssd', 'upgrade', 'storage', 'installation', 'fast']
  },

  // ============================================
  // CATEGORY 4: ELECTRICAL & POWER SERVICES
  // ============================================
  {
    type: 'category',
    taxonomyId: 'electrical-power',
    name: 'Electrical & Power Services',
    description: 'Electrical wiring, solar panels, inverters, UPS, power distribution, maintenance',
    icon: '⚡',
    sortOrder: 4
  },
  // Subcategories
  {
    type: 'subcategory',
    taxonomyId: 'electrical-wiring',
    name: 'Electrical Wiring & Installation',
    description: 'Residential and commercial electrical wiring, circuit installation',
    parentId: 'electrical-power',
    icon: '🔌',
    sortOrder: 1,
    keywords: ['wiring', 'electrical', 'installation', 'cable', 'circuit']
  },
  {
    type: 'subcategory',
    taxonomyId: 'solar-systems',
    name: 'Solar Panel Systems',
    description: 'Solar panel installation, setup, and maintenance for renewable energy',
    parentId: 'electrical-power',
    icon: '☀️',
    sortOrder: 2,
    keywords: ['solar', 'panel', 'renewable', 'energy', 'photovoltaic']
  },
  {
    type: 'subcategory',
    taxonomyId: 'inverter-ups-systems',
    name: 'Inverter & UPS Systems',
    description: 'Inverter installation, UPS (Uninterruptible Power Supply) systems, battery backup',
    parentId: 'electrical-power',
    icon: '🔋',
    sortOrder: 3,
    keywords: ['inverter', 'ups', 'backup', 'power', 'battery']
  },
  {
    type: 'subcategory',
    taxonomyId: 'power-distribution',
    name: 'Power Distribution & Panels',
    description: 'Electrical panel installation, distribution boards, circuit breakers',
    parentId: 'electrical-power',
    icon: '⚙️',
    sortOrder: 4,
    keywords: ['distribution', 'panel', 'circuit', 'breaker', 'board']
  },
  {
    type: 'subcategory',
    taxonomyId: 'electrical-maintenance',
    name: 'Electrical Maintenance & Repair',
    description: 'Electrical system maintenance, troubleshooting, and repair services',
    parentId: 'electrical-power',
    icon: '🔧',
    sortOrder: 5,
    keywords: ['maintenance', 'repair', 'electrical', 'troubleshoot', 'fault']
  },
  // Services
  {
    type: 'service',
    taxonomyId: 'home-wiring',
    name: 'Home Wiring Installation',
    description: 'Residential electrical wiring installation and rewiring',
    parentId: 'electrical-wiring',
    icon: '🏠',
    keywords: ['home', 'wiring', 'installation', 'residential']
  },
  {
    type: 'service',
    taxonomyId: 'commercial-wiring',
    name: 'Commercial Wiring Installation',
    description: 'Commercial and industrial electrical wiring services',
    parentId: 'electrical-wiring',
    icon: '🏢',
    keywords: ['commercial', 'wiring', 'industrial', 'office', 'building']
  },
  {
    type: 'service',
    taxonomyId: 'solar-panel-install',
    name: 'Solar Panel Installation',
    description: 'Complete solar panel system installation with inverter and batteries',
    parentId: 'solar-systems',
    icon: '☀️',
    keywords: ['solar', 'panel', 'installation', 'renewable', 'pv']
  },
  {
    type: 'service',
    taxonomyId: 'solar-maintenance',
    name: 'Solar System Maintenance',
    description: 'Solar panel cleaning and system performance monitoring',
    parentId: 'solar-systems',
    icon: '🧹',
    keywords: ['solar', 'maintenance', 'cleaning', 'performance']
  },
  {
    type: 'service',
    taxonomyId: 'inverter-install',
    name: 'Inverter Installation',
    description: 'Power inverter and voltage stabilizer installation',
    parentId: 'inverter-ups-systems',
    icon: '🔋',
    keywords: ['inverter', 'installation', 'power', 'conversion']
  },
  {
    type: 'service',
    taxonomyId: 'ups-installation',
    name: 'UPS System Installation',
    description: 'Uninterruptible Power Supply (UPS) installation and setup',
    parentId: 'inverter-ups-systems',
    icon: '🔌',
    keywords: ['ups', 'backup', 'power', 'battery', 'installation']
  },
  {
    type: 'service',
    taxonomyId: 'electrical-panel-install',
    name: 'Electrical Panel Installation',
    description: 'Electrical distribution panel and breaker installation',
    parentId: 'power-distribution',
    icon: '⚙️',
    keywords: ['panel', 'distribution', 'breaker', 'electrical']
  },
  {
    type: 'service',
    taxonomyId: 'lighting-installation',
    name: 'Lighting Installation',
    description: 'Indoor and outdoor lighting installation and design',
    parentId: 'electrical-wiring',
    icon: '💡',
    keywords: ['lighting', 'installation', 'indoor', 'outdoor', 'fixtures']
  },

  // ============================================
  // CATEGORY 5: PLUMBING & SANITATION SERVICES
  // ============================================
  {
    type: 'category',
    taxonomyId: 'plumbing-sanitation',
    name: 'Plumbing & Sanitation Services',
    description: 'Plumbing repair, water line installation, drainage, sanitation, and maintenance',
    icon: '🔧',
    sortOrder: 5
  },
  // Subcategories
  {
    type: 'subcategory',
    taxonomyId: 'leak-repair',
    name: 'Leak Detection & Repair',
    description: 'Water leakage detection, repair, and prevention',
    parentId: 'plumbing-sanitation',
    icon: '💧',
    sortOrder: 1,
    keywords: ['leak', 'leakage', 'repair', 'water', 'detection']
  },
  {
    type: 'subcategory',
    taxonomyId: 'pipeline-services',
    name: 'Pipe & Pipeline Services',
    description: 'Water pipe installation, repair, and replacement',
    parentId: 'plumbing-sanitation',
    icon: '🔗',
    sortOrder: 2,
    keywords: ['pipeline', 'pipes', 'installation', 'repair', 'pvc', 'copper']
  },
  {
    type: 'subcategory',
    taxonomyId: 'drainage-systems',
    name: 'Drainage & Sewage Systems',
    description: 'Drainage line installation, maintenance, and sewage system services',
    parentId: 'plumbing-sanitation',
    icon: '🚰',
    sortOrder: 3,
    keywords: ['drainage', 'drain', 'sewage', 'wastewater', 'system']
  },
  {
    type: 'subcategory',
    taxonomyId: 'water-treatment',
    name: 'Water Treatment & Purification',
    description: 'Water purification systems, treatment plants, and filtration',
    parentId: 'plumbing-sanitation',
    icon: '💧',
    sortOrder: 4,
    keywords: ['water', 'treatment', 'purification', 'filter', 'system']
  },
  {
    type: 'subcategory',
    taxonomyId: 'bathroom-fixtures',
    name: 'Bathroom Fixtures & Sanitaryware',
    description: 'Bathroom fixtures, toilets, sinks, taps installation and repair',
    parentId: 'plumbing-sanitation',
    icon: '🚿',
    sortOrder: 5,
    keywords: ['bathroom', 'fixture', 'toilet', 'sink', 'tap', 'sanitary']
  },
  // Services
  {
    type: 'service',
    taxonomyId: 'leakage-detection',
    name: 'Water Leakage Detection',
    description: 'Advanced water leakage detection using technology',
    parentId: 'leak-repair',
    icon: '💧',
    keywords: ['leakage', 'detection', 'water', 'pipe', 'underground']
  },
  {
    type: 'service',
    taxonomyId: 'pipe-replacement',
    name: 'Pipe Replacement Service',
    description: 'Complete water pipe replacement and restoration',
    parentId: 'pipeline-services',
    icon: '🔗',
    keywords: ['pipe', 'replacement', 'water', 'installation', 'repair']
  },
  {
    type: 'service',
    taxonomyId: 'sewer-cleaning',
    name: 'Sewer Line Cleaning',
    description: 'Sewer line and drainage pipe cleaning and clearance',
    parentId: 'drainage-systems',
    icon: '🚰',
    keywords: ['sewer', 'cleaning', 'drainage', 'blockage', 'clearing']
  },
  {
    type: 'service',
    taxonomyId: 'septic-tank',
    name: 'Septic Tank Installation & Maintenance',
    description: 'Septic tank installation, pumping, and maintenance',
    parentId: 'drainage-systems',
    icon: '🚽',
    keywords: ['septic', 'tank', 'installation', 'maintenance', 'pump']
  },
  {
    type: 'service',
    taxonomyId: 'water-purification',
    name: 'Water Purification System',
    description: 'RO, UV, and other water purification system installation',
    parentId: 'water-treatment',
    icon: '💧',
    keywords: ['water', 'purification', 'ro', 'uv', 'filter']
  },
  {
    type: 'service',
    taxonomyId: 'bathroom-fitting',
    name: 'Bathroom Fitting Installation',
    description: 'Toilet, sink, bathtub, and tap installation and repair',
    parentId: 'bathroom-fixtures',
    icon: '🚿',
    keywords: ['bathroom', 'fixture', 'toilet', 'installation', 'fitting']
  },
  {
    type: 'service',
    taxonomyId: 'hot-water-system',
    name: 'Hot Water System Installation',
    description: 'Water heater and hot water system installation and maintenance',
    parentId: 'bathroom-fixtures',
    icon: '🌡️',
    keywords: ['water heater', 'hot water', 'installation', 'boiler']
  },
  {
    type: 'service',
    taxonomyId: 'plumbing-amc',
    name: 'Plumbing AMC & Maintenance',
    description: 'Annual maintenance contracts for plumbing systems',
    parentId: 'leak-repair',
    icon: '📅',
    keywords: ['amc', 'maintenance', 'contract', 'plumbing', 'support']
  }
];

// ============================================
// SEED FUNCTION
// ============================================
async function seedTaxonomy() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Clear existing taxonomy
    await Taxonomy.deleteMany({});
    console.log('🧹 Cleared existing taxonomy data');

    // Insert new taxonomy data
    const result = await Taxonomy.insertMany(taxonomyData);
    console.log(`✅ Inserted ${result.length} taxonomy items\n`);

    // Display summary
    const categories = await Taxonomy.countDocuments({ type: 'category' });
    const subcategories = await Taxonomy.countDocuments({ type: 'subcategory' });
    const services = await Taxonomy.countDocuments({ type: 'service' });

    console.log('📊 TAXONOMY SUMMARY:');
    console.log(`  📁 Categories: ${categories}`);
    console.log(`  📂 Subcategories: ${subcategories}`);
    console.log(`  🔧 Services: ${services}`);
    console.log(`  📈 Total: ${categories + subcategories + services}\n`);

    // Display category tree
    console.log('🌳 CATEGORY STRUCTURE:\n');
    const cats = await Taxonomy.find({ type: 'category' }).sort({ sortOrder: 1 });
    for (const cat of cats) {
      console.log(`  📁 ${cat.name}`);
      const subs = await Taxonomy.find({ 
        type: 'subcategory', 
        parentId: cat.taxonomyId 
      }).sort({ sortOrder: 1 });
      for (const sub of subs) {
        console.log(`    📂 ${sub.name}`);
        const servs = await Taxonomy.find({ 
          type: 'service', 
          parentId: sub.taxonomyId 
        });
        for (const serv of servs) {
          console.log(`      🔧 ${serv.name}`);
        }
      }
      console.log();
    }

    console.log('✨ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding taxonomy:', error);
    process.exit(1);
  }
}

// Run seed
seedTaxonomy();
