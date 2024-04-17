import { Middleware, Next, Req, Res } from '@tsed/common';
import { upload } from '../config/MulterConfig';

@Middleware()
export class UploadMiddleware  {
  use(@Req() req: Req,@Res() res: Res,  @Next() next: Next) {
    const singleUpload = upload.single('file');
    singleUpload(req, res, (err: any) => {
      if (err) {
        return res.status(500).send({ message: err.message });
      }
      next();
    });
  }
}
