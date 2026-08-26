// Comprehensive Geographic Dataset for Bangladesh: All 8 Divisions, All 64 Districts, and All Upazilas/Thanas

export const BANGLADESH_DIVISIONS = [
  'Dhaka',
  'Chattogram',
  'Rajshahi',
  'Khulna',
  'Barishal',
  'Sylhet',
  'Rangpur',
  'Mymensingh',
];

export const BD_GEO_DATA = {
  Dhaka: {
    Dhaka: [
      'Uttara', 'Uttarkhan', 'Dakshinkhan', 'Turag', 'Airport',
      'Mirpur', 'Pallabi', 'Kafrul', 'Shah Ali', 'Darussalam', 'Rupnagar',
      'Gulshan', 'Banani', 'Cantonment', 'Badda', 'Vatara', 'Khilkhet',
      'Dhanmondi', 'Mohammadpur', 'Adabor', 'Kalabagan', 'New Market', 'Sher-e-Bangla Nagar',
      'Tejgaon', 'Tejgaon Industrial Area', 'Hatirjheel', 'Ramna', 'Shahbagh', 'Paltan', 'Motijheel',
      'Khilgaon', 'Rampura', 'Sabujbagh', 'Mugda', 'Jatrabari', 'Demra', 'Kadamtali', 'Shyampur',
      'Lalbagh', 'Kotwali', 'Chawkbazar', 'Bangshal', 'Sutrapur', 'Wari', 'Gandaria', 'Hazaribagh', 'Kamrangirchar',
      'Savar', 'Dhamrai', 'Keraniganj', 'Nawabganj', 'Dohar',
      'Dhaka Metropolitan', 'Dhaka Sadar',
    ],
    Gazipur: ['Gazipur Sadar', 'Kaliakair', 'Kapasia', 'Sreepur', 'Kaliganj', 'Tongi'],
    Narayanganj: ['Narayanganj Sadar', 'Bandar', 'Rupganj', 'Sonargaon', 'Araihazar'],
    Tangail: ['Tangail Sadar', 'Basail', 'Bhuapur', 'Delduar', 'Ghatail', 'Gopalpur', 'Kalihati', 'Madhupur', 'Mirzapur', 'Nagarpur', 'Sakhipur', 'Dhanbari'],
    Faridpur: ['Faridpur Sadar', 'Alfadanga', 'Bhanga', 'Boalmari', 'Charbhadrasan', 'Madhukhali', 'Nagarkanda', 'Sadarpur', 'Saltha'],
    Manikganj: ['Manikganj Sadar', 'Singair', 'Saturia', 'Shibalaya', 'Harirampur', 'Ghior', 'Daulatpur'],
    Munshiganj: ['Munshiganj Sadar', 'Tongibari', 'Sirajdikhan', 'Lohajang', 'Sreenagar', 'Gazaria'],
    Narsingdi: ['Narsingdi Sadar', 'Belabo', 'Monohardi', 'Palash', 'Raipura', 'Shibpur'],
    Gopalganj: ['Gopalganj Sadar', 'Kashiani', 'Kotalipara', 'Muksudpur', 'Tungipara'],
    Madaripur: ['Madaripur Sadar', 'Kalkini', 'Rajoir', 'Shibchar', 'Dasar'],
    Rajbari: ['Rajbari Sadar', 'Baliakandi', 'Goalandaghat', 'Pangsha', 'Kalukhali'],
    Shariatpur: ['Shariatpur Sadar', 'Damudya', 'Janjira', 'Naria', 'Bhedarganj', 'Gosairhat'],
    Kishoreganj: ['Kishoreganj Sadar', 'Austagram', 'Bajitpur', 'Bhairab', 'Hossainpur', 'Itna', 'Karimganj', 'Katiadi', 'Kuliarchar', 'Mithamain', 'Nikli', 'Pakundia', 'Tarail'],
  },
  Chattogram: {
    Chattogram: ['Kotwali', 'Panchlaish', 'Pahartali', 'Halishahar', 'Agrabad', 'Khulshi', 'Bakalia', 'Bayazid', 'Chandgaon', 'Patenga', 'Hathazari', 'Sitakunda', 'Mirsharai', 'Patiya', 'Boalkhali', 'Raozan', 'Rangunia', 'Fatikchhari', 'Anwara', 'Banshkhali', 'Chandanaish', 'Lohagara', 'Satkania', 'Sandwip', 'Karnaphuli'],
    "Cox's Bazar": ["Cox's Bazar Sadar", 'Chakaria', 'Kutubdia', 'Maheshkhali', 'Ramu', 'Teknaf', 'Ukhia', 'Pekua', 'Eidgaon'],
    Cumilla: ['Cumilla Adarsha Sadar', 'Cumilla Sadar Dakshin', 'Barura', 'Brahmanpara', 'Burichang', 'Chandina', 'Chauddagram', 'Daudkandi', 'Debidwar', 'Homna', 'Laksam', 'Muradnagar', 'Nangalkot', 'Titas', 'Meghna', 'Monohargonj', 'Lalmai'],
    Feni: ['Feni Sadar', 'Chhagalnaiya', 'Daganbhuiyan', 'Parshuram', 'Fulgazi', 'Sonagazi'],
    Brahmanbaria: ['Brahmanbaria Sadar', 'Ashuganj', 'Nasirnagar', 'Nabinagar', 'Sarail', 'Kasba', 'Akhaura', 'Bancharampur', 'Bijoynagar'],
    Chandpur: ['Chandpur Sadar', 'Faridganj', 'Haimchar', 'Haziganj', 'Kachua', 'Matlab Dakshin', 'Matlab Uttar', 'Shahrasti'],
    Noakhali: ['Noakhali Sadar', 'Begumganj', 'Chatkhil', 'Companiganj', 'Hatiya', 'Senbagh', 'Subarnachar', 'Kabirhat', 'Sonaimuri'],
    Lakshmipur: ['Lakshmipur Sadar', 'Raipur', 'Ramganj', 'Ramgati', 'Kamalnagar'],
    Rangamati: ['Rangamati Sadar', 'Belaichhari', 'Bagaichhari', 'Barkal', 'Juraichhari', 'Kaptai', 'Kawkhali', 'Langadu', 'Naniarchar', 'Rajasthali'],
    Bandarban: ['Bandarban Sadar', 'Ali Kadam', 'Lama', 'Naikhongchhari', 'Rowangchhari', 'Ruma', 'Thanchi'],
    Khagrachhari: ['Khagrachhari Sadar', 'Dighinala', 'Lakshmichhari', 'Mahalchhari', 'Manikchhari', 'Matiranga', 'Panchhari', 'Ramgarh', 'Guimara'],
  },
  Rajshahi: {
    Rajshahi: ['Boalia', 'Rajpara', 'Motihar', 'Shah Makhdum', 'Chandrima', 'Katakhali', 'Paba', 'Godagari', 'Tanore', 'Bagha', 'Charghat', 'Durgapur', 'Bagmara', 'Mohonpur', 'Puthia'],
    Bogura: ['Bogura Sadar', 'Adamdighi', 'Dhunat', 'Dhupchanchia', 'Gabtali', 'Kahaloo', 'Nandigram', 'Sariakandi', 'Shajahanpur', 'Sherpur', 'Shibganj', 'Sonatala'],
    Pabna: ['Pabna Sadar', 'Atgharia', 'Bera', 'Bhangura', 'Chatmohar', 'Faridpur', 'Ishwardi', 'Santhia', 'Sujanagar'],
    Sirajganj: ['Sirajganj Sadar', 'Belkuchi', 'Chauhali', 'Kamarkhanda', 'Kazipur', 'Raiganj', 'Shahjadpur', 'Tarash', 'Ullapara'],
    Naogaon: ['Naogaon Sadar', 'Atrai', 'Badalgachhi', 'Dhamoirhat', 'Manda', 'Mohadevpur', 'Niamatpur', 'Patnitala', 'Porsha', 'Raninagar', 'Sapahar'],
    Natore: ['Natore Sadar', 'Bagatipara', 'Baraigram', 'Gurudaspur', 'Lalpur', 'Singra', 'Naldanga'],
    'Chapai Nawabganj': ['Chapai Nawabganj Sadar', 'Bholahat', 'Gomastapur', 'Nachole', 'Shibganj'],
    Joypurhat: ['Joypurhat Sadar', 'Akkelpur', 'Kalai', 'Khetlal', 'Panchbibi'],
  },
  Khulna: {
    Khulna: ['Khulna Sadar', 'Sonadanga', 'Khalishpur', 'Daulatpur', 'Khan Jahan Ali', 'Batiaghata', 'Dacope', 'Dumuria', 'Dighalia', 'Koyra', 'Paikgachha', 'Phultala', 'Rupsha', 'Terokhada'],
    Jashore: ['Jashore Sadar', 'Abhaynagar', 'Bagherpara', 'Chaugachha', 'Jhikargachha', 'Keshabpur', 'Manirampur', 'Sharsha'],
    Kushtia: ['Kushtia Sadar', 'Kumarkhali', 'Khoksa', 'Mirpur', 'Daulatpur', 'Bheramara'],
    Satkhira: ['Satkhira Sadar', 'Assasuni', 'Debhata', 'Kalaroa', 'Kaliganj', 'Shyamnagar', 'Tala'],
    Jhenaidah: ['Jhenaidah Sadar', 'Harinakunda', 'Kaliganj', 'Kotchandpur', 'Maheshpur', 'Shailkupa'],
    Chuadanga: ['Chuadanga Sadar', 'Alamdanga', 'Damurhuda', 'Jibannagar'],
    Meherpur: ['Meherpur Sadar', 'Gangni', 'Mujibnagar'],
    Magura: ['Magura Sadar', 'Mohammadpur', 'Shalikha', 'Sreepur'],
    Narail: ['Narail Sadar', 'Kalia', 'Lohagara'],
    Bagerhat: ['Bagerhat Sadar', 'Chitalmari', 'Fakirhat', 'Kachua', 'Mollahat', 'Mongla', 'Morrelganj', 'Rampal', 'Sarankhola'],
  },
  Barishal: {
    Barishal: ['Barishal Sadar', 'Bakerganj', 'Babuganj', 'Muladi', 'Mehendiganj', 'Hizla', 'Banaripara', 'Wazirpur', 'Gournadi', 'Agailjhara'],
    Bhola: ['Bhola Sadar', 'Burhanuddin', 'Char Fasson', 'Daulatkhan', 'Lalmohan', 'Manpura', 'Tazumuddin'],
    Patuakhali: ['Patuakhali Sadar', 'Bauphal', 'Galachipa', 'Kalapara', 'Mirzaganj', 'Dumki', 'Dashmina', 'Rangabali'],
    Pirojpur: ['Pirojpur Sadar', 'Bhandaria', 'Kawkhali', 'Mathbaria', 'Nazirpur', 'Nesarabad (Swarupkati)', 'Indurkani'],
    Jhalokati: ['Jhalokati Sadar', 'Kathalia', 'Nalchity', 'Rajapur'],
    Barguna: ['Barguna Sadar', 'Amtali', 'Bamna', 'Betagi', 'Patharghata', 'Taltali'],
  },
  Sylhet: {
    Sylhet: ['Sylhet Sadar', 'Dakshin Surma', 'Beanibazar', 'Bishwanath', 'Fenchuganj', 'Golapganj', 'Gowainghat', 'Jaintiapur', 'Kanaighat', 'Zakiganj', 'Balaganj', 'Companiganj', 'Osmani Nagar'],
    Moulvibazar: ['Moulvibazar Sadar', 'Barlekha', 'Juri', 'Kamalganj', 'Kulaura', 'Rajnagar', 'Sreemangal'],
    Habiganj: ['Habiganj Sadar', 'Ajmiriganj', 'Bahubal', 'Baniyachong', 'Chunarughat', 'Madhabpur', 'Nabiganj', 'Lakhai', 'Shayestaganj'],
    Sunamganj: ['Sunamganj Sadar', 'Chhatak', 'Jagannathpur', 'Derai', 'Dharampasha', 'Dowarabazar', 'Jamalganj', 'Sullah', 'Tahirpur', 'Bishwamvarpur', 'Shantiganj'],
  },
  Rangpur: {
    Rangpur: ['Rangpur Sadar', 'Badarganj', 'Gangachara', 'Kaunia', 'Mithapukur', 'Pirgachha', 'Pirganj', 'Taraganj'],
    Dinajpur: ['Dinajpur Sadar', 'Birganj', 'Biral', 'Bochaganj', 'Chirirbandar', 'Phulbari', 'Ghoraghat', 'Hakimpur', 'Kaharole', 'Khansama', 'Nawabganj', 'Parbatipur', 'Birol'],
    Kurigram: ['Kurigram Sadar', 'Bhurungamari', 'Char Rajibpur', 'Chilmari', 'Phulbari', 'Nageshwari', 'Rajarhat', 'Raomari', 'Ulipur'],
    Gaibandha: ['Gaibandha Sadar', 'Fulchhari', 'Gobindaganj', 'Palashbari', 'Sadullapur', 'Saghata', 'Sundarganj'],
    Nilphamari: ['Nilphamari Sadar', 'Dimla', 'Domar', 'Jaldhaka', 'Kishoreganj', 'Saidpur'],
    Lalmonirhat: ['Lalmonirhat Sadar', 'Aditmari', 'Hatibandha', 'Kaliganj', 'Patgram'],
    Thakurgaon: ['Thakurgaon Sadar', 'Baliadangi', 'Haripur', 'Pirganj', 'Ranisankail'],
    Panchagarh: ['Panchagarh Sadar', 'Atwari', 'Boda', 'Debiganj', 'Tetulia'],
  },
  Mymensingh: {
    Mymensingh: ['Mymensingh Sadar', 'Bhaluka', 'Dhobaura', 'Fulbaria', 'Gaffargaon', 'Gouripur', 'Haluaghat', 'Ishwarganj', 'Muktagachha', 'Nandail', 'Phulpur', 'Trishal', 'Tara Khanda'],
    Jamalpur: ['Jamalpur Sadar', 'Bakshiganj', 'Dewanganj', 'Islampur', 'Madarganj', 'Melandaha', 'Sarishabari'],
    Netrokona: ['Netrokona Sadar', 'Atpara', 'Barhatta', 'Durgapur', 'Khaliajuri', 'Kalmakanda', 'Kendua', 'Madan', 'Mohanganj', 'Purbadhala'],
    Sherpur: ['Sherpur Sadar', 'Jhenaigati', 'Nakla', 'Nalitabari', 'Sreebardi'],
  },
};

export const BANGLADESH_DISTRICTS_BY_DIVISION = Object.fromEntries(
  Object.entries(BD_GEO_DATA).map(([division, districts]) => [
    division,
    Object.keys(districts),
  ])
);

export const MAJOR_THANAS_BY_DISTRICT = Object.fromEntries(
  Object.values(BD_GEO_DATA).flatMap((districts) => Object.entries(districts))
);

/**
 * Normalizes Division name to standard Bangladesh division naming convention.
 */
export function normalizeDivision(raw = '') {
  if (!raw || typeof raw !== 'string') return '';
  const clean = raw.replace(/Division|Bibhag|বিভাগ/gi, '').trim().toLowerCase();

  const aliases = {
    chittagong: 'Chattogram',
    chattogram: 'Chattogram',
    dhaka: 'Dhaka',
    rajshahi: 'Rajshahi',
    khulna: 'Khulna',
    barisal: 'Barishal',
    barishal: 'Barishal',
    sylhet: 'Sylhet',
    rangpur: 'Rangpur',
    mymensingh: 'Mymensingh',
  };

  if (aliases[clean]) return aliases[clean];
  const found = BANGLADESH_DIVISIONS.find((d) => d.toLowerCase() === clean);
  return found || (clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : '');
}

/**
 * Normalizes District name to standard Bangladesh 64 district naming convention.
 */
export function normalizeDistrict(raw = '', divisionHint = null) {
  if (!raw || typeof raw !== 'string') return '';
  const clean = raw.replace(/District|Zila|Zilla|জেলা/gi, '').trim().toLowerCase();

  const aliases = {
    bogra: 'Bogura',
    bogura: 'Bogura',
    comilla: 'Cumilla',
    cumilla: 'Cumilla',
    jessore: 'Jashore',
    jashore: 'Jashore',
    barisal: 'Barishal',
    barishal: 'Barishal',
    chittagong: 'Chattogram',
    chattogram: 'Chattogram',
    coxsbazar: "Cox's Bazar",
    "cox's bazar": "Cox's Bazar",
    chapainawabganj: 'Chapai Nawabganj',
    'chapai nawabganj': 'Chapai Nawabganj',
    nawabganj: 'Chapai Nawabganj',
    moulvibazar: 'Moulvibazar',
    maulvibazar: 'Moulvibazar',
    moulavibazar: 'Moulvibazar',
    netrokona: 'Netrokona',
    netrakona: 'Netrokona',
  };

  if (aliases[clean]) return aliases[clean];

  const allDistricts = Object.keys(MAJOR_THANAS_BY_DISTRICT);
  const directMatch = allDistricts.find((dst) => dst.toLowerCase() === clean);
  if (directMatch) return directMatch;

  if (divisionHint && BD_GEO_DATA[divisionHint]) {
    const divDistricts = Object.keys(BD_GEO_DATA[divisionHint]);
    const divMatch = divDistricts.find((dst) => clean.includes(dst.toLowerCase()) || dst.toLowerCase().includes(clean));
    if (divMatch) return divMatch;
  }

  const subMatch = allDistricts.find((dst) => clean.includes(dst.toLowerCase()) || dst.toLowerCase().includes(clean));
  if (subMatch) return subMatch;

  return raw.replace(/District|Zila|Zilla/gi, '').trim();
}

const SUB_AREA_TO_THANA = {
  'joar sahara': 'Vatara',
  'joarsahara': 'Vatara',
  'baridhara dohs': 'Cantonment',
  'baridhara': 'Gulshan',
  'bashundhara': 'Vatara',
  'mohakhali dohs': 'Cantonment',
  'banani dohs': 'Cantonment',
  'mirpur dohs': 'Pallabi',
  'nikunja': 'Khilkhet',
  'kuril': 'Vatara',
  'farmgate': 'Tejgaon',
  'karwan bazar': 'Tejgaon',
  'moghbazar': 'Ramna',
  'malibagh': 'Ramna',
  'shantinagar': 'Paltan',
  'kakrail': 'Ramna',
  'elephant road': 'New Market',
  'science lab': 'New Market',
  'aftabnagar': 'Badda',
  'banasree': 'Rampura',
  'tongi': 'Gazipur Sadar',
};

/**
 * Matches Upazila / Thana from district's known upazilas or candidates.
 */
export function findUpazila(district = '', candidates = [], fullAddressText = '') {
  const normDist = normalizeDistrict(district);
  const upazilaList = MAJOR_THANAS_BY_DISTRICT[normDist] || [];

  const candidateArray = Array.isArray(candidates) ? candidates : [candidates];
  const allTextToSearch = [
    ...candidateArray,
    fullAddressText,
  ]
    .filter(Boolean)
    .join(' ');

  if (!allTextToSearch) return '';

  // 1. Sub-area specific dictionary match
  const lowerSearchText = allTextToSearch.toLowerCase();
  for (const [subArea, matchedThana] of Object.entries(SUB_AREA_TO_THANA)) {
    if (lowerSearchText.includes(subArea)) {
      if (upazilaList.length === 0 || upazilaList.some((u) => u.toLowerCase() === matchedThana.toLowerCase())) {
        return matchedThana;
      }
    }
  }

  // 2. Exact or word-boundary search in district's known upazilas
  if (upazilaList.length > 0) {
    for (const upz of upazilaList) {
      const pattern = new RegExp(`\\b${upz.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (pattern.test(allTextToSearch)) {
        return upz;
      }
    }

    // Secondary check without 'Sadar' (e.g. text has 'Gazipur' and upazila is 'Gazipur Sadar')
    for (const upz of upazilaList) {
      const baseName = upz.replace(/\s*Sadar$/i, '').trim();
      if (baseName.length >= 3) {
        const pattern = new RegExp(`\\b${baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (pattern.test(allTextToSearch)) {
          return upz;
        }
      }
    }
  }

  // 3. Global search across all upazilas in Bangladesh if not found in district
  const allUpazilas = Object.values(MAJOR_THANAS_BY_DISTRICT).flat();
  for (const upz of allUpazilas) {
    if (upz.length >= 5 && !upz.toLowerCase().includes('sadar')) {
      const pattern = new RegExp(`\\b${upz.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (pattern.test(allTextToSearch)) {
        return upz;
      }
    }
  }

  // 4. Fallback: Clean up subdistrict / upazila / thana suffixes from the first candidate
  const firstCandidate = candidateArray.find((c) => c && typeof c === 'string' && c.trim().length > 0);
  if (firstCandidate) {
    return firstCandidate.replace(/\s*(Subdistrict|Upazila|Thana|Sadar|Municipality|Paurashava)\s*/gi, '').trim();
  }

  return '';
}
