/**
 * Downtown skyline silhouette used as the border between the pinned hero and
 * the content that scrolls up over it. It sits at the very top of the rising
 * content block: the front row is painted in the content's own base color so
 * its bases fuse seamlessly with the panel below, while the gaps between the
 * buildings stay transparent — the pinned hero shows through them. As the page
 * scrolls, this jagged edge is the leading border that rises above the hero.
 */
export default function Cityscape() {
  return (
    <div aria-hidden className="relative z-10 -mb-px w-full leading-[0]">
      <svg
        viewBox="0 0 800 150"
        preserveAspectRatio="xMidYMax meet"
        className="block h-[64px] w-full sm:h-[104px]"
      >
        {/* Back row: taller, hazier towers in the panel tint for depth. */}
        <g className="fill-navy-soft">
          <rect x="20" y="55" width="34" height="95" />
          <rect x="95" y="30" width="28" height="120" />
          <rect x="107" y="12" width="3" height="18" />
          <rect x="165" y="62" width="40" height="88" />
          <rect x="270" y="25" width="30" height="125" />
          <rect x="283" y="8" width="3" height="17" />
          <rect x="350" y="52" width="36" height="98" />
          <rect x="455" y="38" width="30" height="112" />
          <rect x="530" y="60" width="42" height="90" />
          <rect x="635" y="30" width="32" height="120" />
          <rect x="649" y="12" width="3" height="18" />
          <rect x="720" y="64" width="40" height="86" />
        </g>
        {/* Front row: the content's base color, so bases fuse with the panel. */}
        <g className="fill-navy">
          <rect x="0" y="92" width="52" height="58" />
          <rect x="68" y="78" width="48" height="72" />
          <rect x="135" y="100" width="52" height="50" />
          <rect x="205" y="84" width="46" height="66" />
          <rect x="280" y="104" width="58" height="46" />
          <rect x="360" y="88" width="50" height="62" />
          <rect x="440" y="74" width="44" height="76" />
          <rect x="505" y="100" width="54" height="50" />
          <rect x="580" y="84" width="48" height="66" />
          <rect x="648" y="104" width="54" height="46" />
          <rect x="715" y="80" width="40" height="70" />
          <rect x="770" y="100" width="30" height="50" />
        </g>
      </svg>
    </div>
  );
}
