import { Composition } from 'remotion';
import { Reel, REEL_FRAMES } from './Reel';
import { SHOPS, type ShopKey } from './theme';

// "Reel" is for every shop; "Reel-cafe", "Reel-salon", … show that kind of shop's name on the app screens.
export const Root = () => (
  <>
    {(Object.keys(SHOPS) as ShopKey[]).map((shop) => (
      <Composition
        key={shop}
        id={shop === 'all' ? 'Reel' : `Reel-${shop}`}
        component={Reel}
        defaultProps={{ shop }}
        durationInFrames={REEL_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
    ))}
  </>
);
