
import { _decorator, Component, Node, Mesh, primitives, gfx, MeshRenderer, utils } from 'cc';
const { ccclass, property } = _decorator;
 
@ccclass('DebugCube')
export class DebugCube extends Component {
    // [1]
    // dummy = '';

    // [2]
    // @property
    // serializableDummy = 0;

    start () {
        const mr = this.getComponent(MeshRenderer);
        const mesh = mr?.mesh;
        if (mr && mesh) {
            mesh.reset(this.genMesh());
            mr.mesh = mesh;
        } else {
            console.log('mesh renderer is null');
        }
    }

    // update (deltaTime: number) {
    //     // [4]
    // }

    genMesh(): Mesh.ICreateInfo {
        let geo: primitives.IGeometry = {
            primitiveMode: gfx.PrimitiveMode.TRIANGLE_STRIP,
            positions: [
                // front
                -1,  1,  1,
                -1, -1,  1,
                 1, -1,  1,
                 1,  1,  1,

                // back
                 1,  1, -1,
                 1, -1, -1,
                -1, -1, -1,
                -1,  1, -1,

                // right
                 1,  1,  1,
                 1, -1,  1,
                 1, -1, -1,
                 1,  1, -1,

                // left
                -1,  1, -1,
                -1, -1, -1,
                -1, -1,  1,
                -1,  1,  1,

                // top
                -1,  1, -1,
                -1,  1,  1,
                 1,  1,  1,
                 1,  1, -1,

                // bottom
                -1, -1,  1,
                -1, -1, -1,
                 1, -1, -1,
                 1, -1,  1,
            ],
            colors: [
                0, 0, 1, 1,
                0, 0, 1, 1,
                0, 0, 1, 1,
                0, 0, 1, 1,

                0.1, 0.1, 1, 1,
                0.1, 0.1, 1, 1,
                0.1, 0.1, 1, 1,
                0.1, 0.1, 1, 1,

                1, 0, 0, 1,
                1, 0, 0, 1,
                1, 0, 0, 1,
                1, 0, 0, 1,

                1, 0.1, 0.1, 1,
                1, 0.1, 0.1, 1,
                1, 0.1, 0.1, 1,
                1, 0.1, 0.1, 1,

                0, 1, 0, 1,
                0, 1, 0, 1,
                0, 1, 0, 1,
                0, 1, 0, 1,

                0.1, 1, 0.1, 1,
                0.1, 1, 0.1, 1,
                0.1, 1, 0.1, 1,
                0.1, 1, 0.1, 1,

            ],
            normals: [
                0, 0, 1,
                0, 0, 1,
                0, 0, 1,
                0, 0, 1,
                0, 0, -1,
                0, 0, -1,
                0, 0, -1,
                0, 0, -1,
                1, 0, 0,
                1, 0, 0,
                1, 0, 0,
                1, 0, 0,
                -1, 0, 0,
                -1, 0, 0,
                -1, 0, 0,
                -1, 0, 0,
                0, 1, 0,
                0, 1, 0,
                0, 1, 0,
                0, 1, 0,
                0, -1, 0,
                0, -1, 0,
                0, -1, 0,
                0, -1, 0,
            ],
            attributes: [
                new gfx.Attribute(gfx.AttributeName.ATTR_POSITION, gfx.Format.RGB32F),
                new gfx.Attribute(gfx.AttributeName.ATTR_COLOR, gfx.Format.RGBA32F),
                new gfx.Attribute(gfx.AttributeName.ATTR_NORMAL, gfx.Format.RGB32F),
            ],
            indices: [
                0, 1, 2, 3, 0, 2,
                4, 5, 6, 7, 4, 6,
                8, 9, 10, 11, 8, 10,
                12, 13, 14, 15, 12, 14,
                16, 17, 18, 19, 16, 18,
                20, 21, 22, 23, 20, 22
            ],
        };

        return utils.createMesh(geo, undefined, { calculateBounds: false });
    }
}

