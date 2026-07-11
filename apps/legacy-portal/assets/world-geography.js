(() => {
  'use strict';
  const CDN = 'https://cdn.jsdelivr.net/npm/world-atlas@2/land-50m.json';
  const FALLBACK = [
    [[-168,72],[-155,62],[-142,60],[-130,52],[-124,40],[-117,31],[-105,23],[-97,18],[-86,20],[-82,9],[-76,18],[-73,38],[-58,50],[-52,62],[-75,72],[-110,73],[-140,70],[-168,72]],
    [[-81,12],[-70,11],[-58,7],[-49,1],[-43,-10],[-48,-25],[-55,-35],[-65,-55],[-73,-51],[-70,-18],[-77,-4],[-81,12]],
    [[-11,36],[-4,44],[10,45],[22,41],[32,41],[40,48],[33,58],[22,67],[6,71],[-8,58],[-11,36]],
    [[-18,36],[10,37],[32,31],[51,12],[42,-12],[34,-27],[18,-35],[8,-34],[-4,-18],[-15,6],[-18,36]],
    [[22,68],[60,73],[100,72],[135,62],[162,56],[146,42],[122,31],[117,20],[108,9],[98,8],[83,21],[68,24],[49,38],[38,50],[22,68]],
    [[34,30],[56,29],[58,16],[51,12],[43,13],[34,30]],
    [[68,24],[89,23],[101,8],[94,6],[79,8],[68,24]],
    [[95,6],[104,7],[106,1],[104,-5],[99,-2],[95,6]],
    [[100,7],[105,1],[104,-5],[97,-4],[96,1],[100,7]],
    [[108,7],[118,7],[119,-4],[114,-4],[108,0],[108,7]],
    [[119,2],[124,4],[125,-4],[121,-5],[119,2]],
    [[125,20],[128,26],[123,19],[119,13],[121,8],[125,20]],
    [[130,31],[142,46],[146,44],[142,34],[135,31],[130,31]],
    [[120,18],[126,20],[126,9],[120,6],[120,18]],
    [[113,-11],[130,-12],[143,-11],[154,-28],[153,-39],[135,-44],[116,-35],[113,-11]],
    [[166,-34],[178,-35],[178,-47],[168,-48],[166,-34]],
    [[43,-12],[50,-14],[51,-26],[47,-26],[43,-12]],
    [[57.1,-19.85],[57.9,-19.85],[57.9,-20.55],[57.1,-20.55],[57.1,-19.85]]
  ];
  const LABELS = {
    na: [49,-101], sa: [-17,-58], eu: [52,13], af: [5,20], as: [42,88], oc: [-25,136]
  };
  const MICRO_LAND = {
    singapore: {lat:1.3521, lng:103.8198, size:2.4},
    portlouis: {lat:-20.1609, lng:57.5012, size:3.4},
    hongkong: {lat:22.3193, lng:114.1694, size:1.7},
    montevideo: {lat:-34.9011, lng:-56.1645, size:1.8}
  };
  const state = { polygons: FALLBACK.map(ring => [ring]), source: 'embedded', pending: null };
  function decodeArc(topology, index) {
    const backwards = index < 0;
    const arc = topology.arcs[backwards ? ~index : index] || [];
    const tr = topology.transform || {scale:[1,1], translate:[0,0]};
    let x = 0, y = 0;
    const points = arc.map(step => {
      x += step[0]; y += step[1];
      return [x * tr.scale[0] + tr.translate[0], y * tr.scale[1] + tr.translate[1]];
    });
    return backwards ? points.reverse() : points;
  }
  function stitch(topology, indexes) {
    const output = [];
    indexes.forEach((index, i) => {
      const points = decodeArc(topology, index);
      output.push(...(i ? points.slice(1) : points));
    });
    return output;
  }
  function extract(topology, object) {
    const polygons = [];
    function walk(geometry) {
      if (!geometry) return;
      if (geometry.type === 'GeometryCollection') {
        geometry.geometries.forEach(walk);
      } else if (geometry.type === 'Polygon') {
        polygons.push(geometry.arcs.map(ring => stitch(topology, ring)));
      } else if (geometry.type === 'MultiPolygon') {
        geometry.arcs.forEach(poly => polygons.push(poly.map(ring => stitch(topology, ring))));
      }
    }
    walk(object);
    return polygons;
  }
  async function load() {
    if (state.source === 'natural-earth') return state.polygons;
    if (state.pending) return state.pending;
    state.pending = fetch(CDN, {cache:'force-cache'})
      .then(response => {
        if (!response.ok) throw new Error('Natural Earth download unavailable');
        return response.json();
      })
      .then(topology => {
        const polygons = extract(topology, topology.objects && topology.objects.land);
        if (!polygons.length) throw new Error('Natural Earth land layer empty');
        state.polygons = polygons;
        state.source = 'natural-earth';
        document.dispatchEvent(new CustomEvent('gnk-geography-ready', {detail:{source:state.source}}));
        return polygons;
      })
      .catch(() => {
        state.source = 'embedded';
        document.dispatchEvent(new CustomEvent('gnk-geography-ready', {detail:{source:state.source}}));
        return state.polygons;
      });
    return state.pending;
  }
  window.GNK_GEOGRAPHY = {state, labels:LABELS, microLand:MICRO_LAND, load};
  load();
})();
