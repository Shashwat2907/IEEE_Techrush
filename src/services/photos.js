/**
 * Authentic, curated high-resolution destination photography
 * Hand-picked specific photos for all global locations in TripNest
 */

const DESTINATION_PHOTOS = {
  'new-york-us': 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1200&q=80', // NYC Manhattan Skyline
  'kyoto-jp': 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80', // Kyoto Temple / Pagoda
  'bali-id': 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80', // Bali Rice Terraces & Temple
  'paris-fr': 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80', // Paris Eiffel Tower
  'goa-in': 'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80', // Goa Beach Sunset
  'santorini-gr': 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80', // Santorini Oia Blue Domes
  'reykjavik-is': 'https://images.unsplash.com/photo-1504893524553-b855bce32c67?auto=format&fit=crop&w=1200&q=80', // Iceland Aurora / Waterfall
  'machu-picchu-pe': 'https://images.unsplash.com/photo-1526392060635-9d6019884377?auto=format&fit=crop&w=1200&q=80', // Machu Picchu Ruins
  'marrakech-ma': 'https://images.unsplash.com/photo-1597212618440-806262de4f6b?auto=format&fit=crop&w=1200&q=80', // Marrakech Riad / Souks
  'queenstown-nz': 'https://images.unsplash.com/photo-1507699622108-4be3abd695ad?auto=format&fit=crop&w=1200&q=80', // Queenstown Lake & Mountains
  'cape-town-za': 'https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=1200&q=80', // Cape Town Table Mountain
  'tokyo-jp': 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80', // Tokyo Shibuya Night Skyline
  'dubai-ae': 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80', // Dubai Burj Khalifa Skyline
  'maldives-mv': 'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1200&q=80', // Maldives Overwater Bungalows
  'rio-br': 'https://images.unsplash.com/photo-1483729558449-99ef09a8c325?auto=format&fit=crop&w=1200&q=80', // Rio Christ Redeemer & Harbor
  'bangkok-th': 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80', // Bangkok Grand Palace Temple
  'swiss-alps-ch': 'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1200&q=80', // Swiss Alps Matterhorn Peak
  'cairo-eg': 'https://images.unsplash.com/photo-1539768942893-daf53e448371?auto=format&fit=crop&w=1200&q=80', // Cairo Pyramids of Giza
  'phuket-th': 'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=1200&q=80', // Phuket Limestone Bay
  'patagonia-ar': 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=1200&q=80', // Patagonia Glaciers & Peaks
};

const CITY_NAME_FALLBACKS = [
  { match: ['amalfi', 'positano'], url: 'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=1200&q=80' },
  { match: ['rome', 'roma', 'italy'], url: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80' },
  { match: ['barcelona', 'spain'], url: 'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1200&q=80' },
  { match: ['london', 'uk', 'england'], url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80' },
  { match: ['sydney', 'australia'], url: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1200&q=80' },
  { match: ['amsterdam', 'netherlands'], url: 'https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=1200&q=80' },
  { match: ['vancouver', 'canada'], url: 'https://images.unsplash.com/photo-1559511260-66a65e09b245?auto=format&fit=crop&w=1200&q=80' },
  { match: ['singapore'], url: 'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1200&q=80' },
  { match: ['hawaii', 'honolulu'], url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80' },
  { match: ['venice', 'venezia'], url: 'https://images.unsplash.com/photo-1514890547357-a9ee288728e0?auto=format&fit=crop&w=1200&q=80' },
  { match: ['beach', 'island', 'coast'], url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80' },
  { match: ['mountain', 'alps', 'snow', 'hike'], url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=80' },
];

const DEFAULT_TRAVEL_PHOTO = 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80';

/**
 * Returns an authentic photo URL for any destination object or city name
 */
export function getDestinationPhoto(destination) {
  if (!destination) return DEFAULT_TRAVEL_PHOTO;

  // 1. Direct ID match
  if (destination.id && DESTINATION_PHOTOS[destination.id]) {
    return DESTINATION_PHOTOS[destination.id];
  }

  // 2. Name search matching
  const nameStr = (destination.name || destination.id || '').toLowerCase();
  for (const [id, url] of Object.entries(DESTINATION_PHOTOS)) {
    const cleanId = id.replace(/-[a-z]{2}$/, '').replace(/-/g, ' ');
    if (nameStr.includes(cleanId) || cleanId.includes(nameStr)) {
      return url;
    }
  }

  // 3. City keyword fallback
  for (const item of CITY_NAME_FALLBACKS) {
    if (item.match.some((m) => nameStr.includes(m))) {
      return item.url;
    }
  }

  return DEFAULT_TRAVEL_PHOTO;
}
