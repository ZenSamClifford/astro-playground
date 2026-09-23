import ClientRouteLoader from '@contensis/content-resolver/framework/ClientRouteLoader.tsx';
import { contentResolver } from '~/contensis.config';

type Props = Omit<Parameters<typeof ClientRouteLoader>[0], 'contentResolver'>;

const AppClientRouteLoader = (props: Props) => {
  return <ClientRouteLoader {...props} contentResolver={contentResolver} />;
};

export default AppClientRouteLoader;
