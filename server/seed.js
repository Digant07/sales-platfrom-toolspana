const bcrypt = require('bcryptjs');
const db = require('./db');

async function seedDefaults() {
  try {
    console.log('--- Initializing Database Users & Defaults ---');

    // Check admin
    const adminUser = await db.get('SELECT id FROM users WHERE username = ?', ['admin']);
    if (!adminUser) {
      const adminPassHash = bcrypt.hashSync('admin123', 10);
      await db.run(`
        INSERT INTO users (name, username, password_hash, role, phone, is_active)
        VALUES (?, ?, ?, 'admin', ?, 1)
      `, ['Operations Director (Admin)', 'admin', adminPassHash, '+91 9800000000']);
      console.log('Created Admin user: admin / admin123');
    }

    // Check agent 1
    const agent1 = await db.get('SELECT id FROM users WHERE username = ?', ['agent1']);
    if (!agent1) {
      const agentPassHash = bcrypt.hashSync('agent123', 10);
      await db.run(`
        INSERT INTO users (name, username, password_hash, role, phone, is_active)
        VALUES (?, ?, ?, 'agent', ?, 1)
      `, ['Rajesh Sharma (Telecaller 1)', 'agent1', agentPassHash, '+91 9829011223']);
      console.log('Created Agent user: agent1 / agent123');
    }

    // Check agent 2
    const agent2 = await db.get('SELECT id FROM users WHERE username = ?', ['agent2']);
    if (!agent2) {
      const agentPassHash = bcrypt.hashSync('agent123', 10);
      await db.run(`
        INSERT INTO users (name, username, password_hash, role, phone, is_active)
        VALUES (?, ?, ?, 'agent', ?, 1)
      `, ['Priya Patel (Telecaller 2)', 'agent2', agentPassHash, '+91 9829044556']);
      console.log('Created Agent user: agent2 / agent123');
    }

    // Check if any leads exist; if not, seed the 29 power tools leads automatically!
    const leadCountRow = await db.get('SELECT COUNT(*) as count FROM leads');
    const leadCount = leadCountRow ? leadCountRow.count : 0;
    if (leadCount === 0) {
      console.log('Database has no leads. Seeding initial leads from catalog...');
      const sampleLeads = [
        { idCode: 'PT-NUM-001', name: 'Savita Iron Store', phone: '+91 9649192370', alt: '', town: 'Bijolia', dist: 'Bhilwara', owner: 'Proprietor', products: 'Heavy 5"/7" Angle Grinders, Turbo Diamond Blades, Welding Rods', pitch: 'Supply high-wear cutting blades & angle grinders directly via Kota-Bhilwara delivery beat.' },
        { idCode: 'PT-NUM-002', name: 'Sarmathura Stone Industries & Tools', phone: '+91 7949224484', alt: '+91 9782277091', town: 'Sarmathura', dist: 'Dholpur', owner: 'Dinesh / Commercial Desk', products: '11E Demolition Breakers, Heavy Grinders, Diamond Saws', pitch: 'Direct B2B dispatch with specialized volume discounts on demolition chisels and diamond saws.' },
        { idCode: 'PT-NUM-003', name: 'Sadguru Stone & Tools', phone: '+91 9667177989', alt: '', town: 'Sarmathura', dist: 'Dholpur', owner: 'Rameshwar Dayal', products: '110mm Marble Cutters, 4" Grinders, Heavy Masonry Chisels', pitch: 'Pitch durable copper motor power tools with an assured spare-armature replacement warranty.' },
        { idCode: 'PT-NUM-004', name: 'Sarmathura Stone Udhog', phone: '+91 751-203262', alt: '+91 751-203650', town: 'Sarmathura', dist: 'Dholpur', owner: 'Factory In-charge', products: 'Gangsaw Blades, Bridge Cutter Spares, 9" Angle Grinders', pitch: 'Introduce factory-direct consignment stocking for high-wear cutting consumables.' },
        { idCode: 'PT-NUM-005', name: 'Pooja Furniture & Hardware House', phone: '+91 9414499836', alt: '', town: 'Bayana', dist: 'Bharatpur', owner: 'Pooja / Store Manager', products: 'Rotary Hammers, Circular Saws, Wood Planers, Impact Drills', pitch: 'Establish Bayana weekly delivery beat covering masonry and carpentry power tools.' },
        { idCode: 'PT-NUM-006', name: 'Om Choudhary Hardware', phone: '+91 8047622116', alt: '', town: 'Sikandra', dist: 'Dausa', owner: 'Om Choudhary', products: 'Cabinet Hardware, Hand Tools, Tile Cutters, 4" Angle Grinders', pitch: 'Direct B2B carton rates with 15-day rolling credit for recurring hardware and cutting tool buyers.' },
        { idCode: 'PT-NUM-007', name: 'Shri Parasnath Hardware Store', phone: '+91 8047624596', alt: '', town: 'Sikandra', dist: 'Dausa', owner: 'Store Counter', products: 'Stainless Steel Screws, Drill Bits, Hand Tools, Marble Cutters', pitch: 'Bundle fast-wearing carbon brushes and armatures with every power tool package.' },
        { idCode: 'PT-NUM-008', name: 'Shree Ambe Paints & Hardware Store', phone: '+91 8769906604', alt: '', town: 'Mokalsar', dist: 'Balotra (Barmer)', owner: 'Proprietor', products: 'Granite Bridge Cutters, 4" & 5" Grinders, Flap Discs, Polishers', pitch: 'Pitch high-torque wet stone polishers, resin polishing pads, and heavy grinding wheels.' },
        { idCode: 'PT-NUM-009', name: 'Laxmi Spare Parts & Tools', phone: '+91 9462280176', alt: '', town: 'Siwana', dist: 'Balotra (Barmer)', owner: 'Babulal / Counter Manager', products: 'Armatures, Carbon Brushes, Bearings (608/629), Rotary Hammers', pitch: 'Supply a dedicated spares counter box with bearings, switches, and copper armatures.' },
        { idCode: 'PT-NUM-010', name: 'Dhirani Enterprises', phone: '+91 7891291208', alt: '', town: 'Siwana', dist: 'Balotra (Barmer)', owner: 'Dhirani Ji', products: 'Inverter ARC Welders, Angle Grinders, Magnetic Drills', pitch: 'Guaranteed 24-hour bus/transporter parcel delivery with direct factory credit terms.' },
        { idCode: 'PT-NUM-011', name: 'Parmeshwar And Company', phone: '+91 9460460595', alt: '', town: 'Siwana', dist: 'Balotra (Barmer)', owner: 'Parmeshwar Ji', products: 'Demolition Hammers, Heavy Rotary Drills, Cut-Off Discs', pitch: 'Provide demo units of 11kg/16kg demolition breakers and free on-site contractor trials.' },
        { idCode: 'PT-NUM-012', name: 'Supertech Diamond Tools Pvt. Ltd.', phone: '+91 9414174650', alt: '+91 9414174350', town: 'Dhoinda', dist: 'Rajsamand', owner: 'Commercial Desk / Sales', products: 'Gangsaw Segments, Circular Saw Blanks, Diamond Wire Saw Beads', pitch: 'Offer OEM distributor partnerships and circular saw blanks for secondary processing units.' },
        { idCode: 'PT-NUM-013', name: 'Vaidehi Diamond Tools', phone: '+91 9667588998', alt: '', town: 'Dhoinda', dist: 'Rajsamand', owner: 'Store In-charge', products: 'Diamond Cutting Tools, Gangsaw Blades, Diamond Wire Saw Rope', pitch: 'Bulk supply contract for diamond wire rope and circular segments with tiered quantity rebates.' },
        { idCode: 'PT-NUM-014', name: 'AK Enterprises (Jain Bandhu)', phone: '+91 9413037563', alt: '', town: 'Borawar (Makrana)', dist: 'Didwana-Kuchaman (Nagaur)', owner: 'Jain Bandhu / Owner', products: 'Marble Cutting Machines, Heavy Grinders, Diamond Blades, Hardware', pitch: 'Provide specialized dust-sealed marble cutters and wet angle polishers for marble yards.' },
        { idCode: 'PT-NUM-015', name: 'M M Power Tools (M M Tools & Spare)', phone: '+91 8047845903', alt: '', town: 'Sumerpur', dist: 'Pali', owner: 'Manish / Proprietor', products: 'Electric Power Tools, Cutting Tools, Jigsaw Machines, Tool Spares', pitch: 'Appoint as authorized service & sales depot with wholesale discount on complete spares catalog.' },
      ];

      const clean = (num) => String(num || '').replace(/[^\d+]/g, '');

      for (const item of sampleLeads) {
        await db.run(`
          INSERT INTO leads (
            lead_id_code,
            lead_name,
            phone_number,
            raw_phone,
            alternate_phone,
            company_or_details,
            extra_data,
            status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending')
        `, [
          item.idCode,
          item.name,
          clean(item.phone),
          item.phone,
          clean(item.alt),
          `${item.town}, ${item.dist} | Products: ${item.products}`,
          JSON.stringify({
            'Town / Cluster': item.town,
            'District': item.dist,
            'Owner': item.owner,
            'Demand': item.products,
            'Recommended Pitch': item.pitch,
          })
        ]);
      }
      console.log(`Seeded ${sampleLeads.length} initial leads into Pending queue.`);
    }

    console.log('--- Database Initialization Complete ---');
  } catch (err) {
    console.error('Seed error:', err);
  }
}

module.exports = seedDefaults;

if (require.main === module) {
  seedDefaults();
}
