import { Mat3, Quat } from 'cc';

export class Utils {

    public static quat2Rot(quat: Quat): Mat3 {	
        const qx = quat.x;
        const qy = quat.y;
        const qz = quat.z;
        const qw = quat.w;

        return new Mat3(
            1 - 2*qy^2 - 2*qz^2, 2*qx*qy - 2*qz*qw,   2*qx*qz + 2*qy*qw,
            2*qx*qy + 2*qz*qw,   1 - 2*qx^2 - 2*qz^2, 2*qy*qz - 2*qx*qw,
            2*qx*qz - 2*qy*qw,   2*qy*qz + 2*qx*qw,   1 - 2*qx^2 - 2*qy^2);
    }

}