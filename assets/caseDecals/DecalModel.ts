
import { Color, gfx, instantiate, Mat4, Material, MeshRenderer, Node, random, renderer, utils, Vec2, Vec3, _decorator } from "cc";
const { ccclass, property } = _decorator;

class DecalVertex {
    position: Vec3;
    normal: Vec3;
    uv: Vec2;

    constructor(...args: any[]) {
        this.position = Vec3.ZERO;
        this.normal = Vec3.ZERO;
        this.uv = Vec2.ZERO;
        if (args.length >= 3) {
            this.uv = args[2];
        }
        if (args.length >= 2) {
            this.normal = args[1];
        }
        if (args.length >= 1) {
            this.position = args[0];
        }
    }

    clone(): DecalVertex {
        const dv = new DecalVertex();

        dv.position = this.position.clone();
        dv.normal = this.normal.clone();
        dv.uv = this.uv.clone();

        return dv;
    }
}

@ccclass('DecalModel')
export class DecalModel {

    private mod: renderer.scene.Model | null = null;
    private position: Vec3 = new Vec3(0, 0, 0);
    private direction: Vec3 = new Vec3(0, 0, 0);
    private scale: Vec3 = new Vec3(0, 0, 0);

    private worldMat: Mat4 = new Mat4();
    private projectorMatrix: Mat4 = new Mat4();
    private projectorMatInverse: Mat4 = new Mat4();

    private decalVertexes: DecalVertex[] = [];
    private meshPositions: number[] = [];
    private meshNormals: number[] = [];
    private meshUVs: number[] = [];

    static create(decalTemplate: Node, m: renderer.scene.Model, p: Vec3, d: Vec3, s: Vec3): Node {
        const dm = new DecalModel();
        dm.mod = m;
        dm.position = p;
        dm.direction = d;
        dm.scale = s;
        dm.generate();

        const n = instantiate(decalTemplate);
        n.name = "Decal";
        n.active = true;
        n.scale = s;
        Vec3.transformMat4(n.position, p, dm.worldMat);

        const mr = n.getComponent(MeshRenderer);
        mr?.material?.setProperty('albedo', new Color(random()*255, random()*255, random()*255));

        // mr?.mesh?.reset(utils.createMesh({
        //     primitiveMode: gfx.PrimitiveMode.TRIANGLE_STRIP,
        //     positions: dm.meshPositions,
        //     normals: dm.meshNormals,
        //     uvs: dm.meshUVs,
        //     attributes: [
        //         new gfx.Attribute(gfx.AttributeName.ATTR_POSITION, gfx.Format.RGB32F),
        //         new gfx.Attribute(gfx.AttributeName.ATTR_NORMAL, gfx.Format.RGB32F),
        //         new gfx.Attribute(gfx.AttributeName.ATTR_TEX_COORD, gfx.Format.RG32F),
        //     ],
        // }, undefined, { calculateBounds: false }));

        return n;
    }

    generate() {
        Mat4.lookAt(this.projectorMatrix, this.position, this.position.add(this.direction), Vec3.ONE);
        Mat4.invert(this.projectorMatInverse, this.projectorMatrix);
        if (this.mod) {
            this.worldMat = this.mod.transform.worldMatrix;
        }

        if (null == this.mod) {
            return;
        }
        for(const subMod of this.mod.subModels) {
            const posArr = subMod.subMesh.mesh?.readAttribute(subMod.subMesh.subMeshIdx!, gfx.AttributeName.ATTR_POSITION) as unknown as Float32Array;
            const norArr = subMod.subMesh.mesh?.readAttribute(subMod.subMesh.subMeshIdx!, gfx.AttributeName.ATTR_NORMAL) as unknown as Float32Array;

            if (posArr.length != norArr.length) {
                console.log('ERROR, position array length is not same with normal');
            }
            for (let idx = 0; idx < posArr.length; idx+=3) {
                this.appendDecalVertex(
                    new Vec3(posArr[idx], posArr[idx+1], posArr[idx+2]),
                    new Vec3(norArr[idx], norArr[idx+1], norArr[idx+2]));
            }
        }

        this.decalVertexes = this.clipGeometry(this.decalVertexes, new Vec3( 1, 0, 0 ));
        this.decalVertexes = this.clipGeometry(this.decalVertexes, new Vec3(-1, 0, 0 ));
        this.decalVertexes = this.clipGeometry(this.decalVertexes, new Vec3( 0, 1, 0 ));
        this.decalVertexes = this.clipGeometry(this.decalVertexes, new Vec3( 0,-1, 0 ));
        this.decalVertexes = this.clipGeometry(this.decalVertexes, new Vec3( 0, 0, 1 ));
        this.decalVertexes = this.clipGeometry(this.decalVertexes, new Vec3( 0, 0,-1 ));

        for ( let i = 0; i < this.decalVertexes.length; i ++ ) {

            const decalVertex = this.decalVertexes[ i ];

            // create texture coordinates (we are still in projector space)

            decalVertex.uv = new Vec2(
                0.5 + ( decalVertex.position.x / this.scale.x ),
                0.5 + ( decalVertex.position.y / this.scale.y )
            );

            // transform the vertex back to world space
            decalVertex.position.transformMat4(this.projectorMatrix);


        }

    }

    appendDecalVertex(v: Vec3, n: Vec3) {
        v.transformMat4(this.worldMat);
        v.transformMat4(this.projectorMatInverse);
        n.transformMat4(this.worldMat);

        this.decalVertexes.push(new DecalVertex(v, n));
    }

    clipGeometry(inDecalVer: DecalVertex[], plane: Vec3): DecalVertex[] {
        const inVertices = inDecalVer;
        const outVertices = [];
        const s = 0.5 * Math.abs(this.scale.dot(plane));

        // a single iteration clips one face,
        // which consists of three consecutive 'DecalVertex' objects

        for ( let i = 0; i < inVertices.length; i += 3 ) {
            let total = 0;
            let nV1 = new DecalVertex();
            let nV2 = new DecalVertex();
            let nV3 = new DecalVertex();
            let nV4 = new DecalVertex();

            const d1 = inVertices[ i + 0 ].position.dot( plane ) - s;
            const d2 = inVertices[ i + 1 ].position.dot( plane ) - s;
            const d3 = inVertices[ i + 2 ].position.dot( plane ) - s;

            const v1Out = d1 > 0;
            const v2Out = d2 > 0;
            const v3Out = d3 > 0;

            // calculate, how many vertices of the face lie outside of the clipping plane

            total = ( v1Out ? 1 : 0 ) + ( v2Out ? 1 : 0 ) + ( v3Out ? 1 : 0 );

            switch ( total ) {

                case 0: {

                    // the entire face lies inside of the plane, no clipping needed

                    outVertices.push( inVertices[ i ] );
                    outVertices.push( inVertices[ i + 1 ] );
                    outVertices.push( inVertices[ i + 2 ] );
                    break;

                }

                case 1: {

                    // one vertex lies outside of the plane, perform clipping

                    if ( v1Out ) {

                        nV1 = inVertices[ i + 1 ];
                        nV2 = inVertices[ i + 2 ];
                        nV3 = this.clip( inVertices[ i ], nV1, plane, s );
                        nV4 = this.clip( inVertices[ i ], nV2, plane, s );

                    }

                    if ( v2Out ) {

                        nV1 = inVertices[ i ];
                        nV2 = inVertices[ i + 2 ];
                        nV3 = this.clip( inVertices[ i + 1 ], nV1, plane, s );
                        nV4 = this.clip( inVertices[ i + 1 ], nV2, plane, s );

                        outVertices.push( nV3 );
                        outVertices.push( nV2.clone() );
                        outVertices.push( nV1.clone() );

                        outVertices.push( nV2.clone() );
                        outVertices.push( nV3.clone() );
                        outVertices.push( nV4 );
                        break;

                    }

                    if ( v3Out ) {

                        nV1 = inVertices[ i ];
                        nV2 = inVertices[ i + 1 ];
                        nV3 = this.clip( inVertices[ i + 2 ], nV1, plane, s );
                        nV4 = this.clip( inVertices[ i + 2 ], nV2, plane, s );

                    }

                    outVertices.push( nV1.clone() );
                    outVertices.push( nV2.clone() );
                    outVertices.push( nV3 );

                    outVertices.push( nV4 );
                    outVertices.push( nV3.clone() );
                    outVertices.push( nV2.clone() );

                    break;

                }

                case 2: {

                    // two vertices lies outside of the plane, perform clipping

                    if ( ! v1Out ) {

                        nV1 = inVertices[ i ].clone();
                        nV2 = this.clip( nV1, inVertices[ i + 1 ], plane, s );
                        nV3 = this.clip( nV1, inVertices[ i + 2 ], plane, s );
                        outVertices.push( nV1 );
                        outVertices.push( nV2 );
                        outVertices.push( nV3 );

                    }

                    if ( ! v2Out ) {

                        nV1 = inVertices[ i + 1 ].clone();
                        nV2 = this.clip( nV1, inVertices[ i + 2 ], plane, s );
                        nV3 = this.clip( nV1, inVertices[ i ], plane, s );
                        outVertices.push( nV1 );
                        outVertices.push( nV2 );
                        outVertices.push( nV3 );

                    }

                    if ( ! v3Out ) {

                        nV1 = inVertices[ i + 2 ].clone();
                        nV2 = this.clip( nV1, inVertices[ i ], plane, s );
                        nV3 = this.clip( nV1, inVertices[ i + 1 ], plane, s );
                        outVertices.push( nV1 );
                        outVertices.push( nV2 );
                        outVertices.push( nV3 );
                    }

                    break;

                }

                case 3: {

                    // the entire face lies outside of the plane, so let's discard the corresponding vertices

                    break;

                }

            }

        }

        return outVertices;
    }

    clip( v0: DecalVertex, v1: DecalVertex, p: Vec3, s: number): DecalVertex {
        const d0 = v0.position.dot( p ) - s;
        const d1 = v1.position.dot( p ) - s;

        const s0 = d0 / ( d0 - d1 );

        const ver = new DecalVertex(
            new Vec3(
                v0.position.x + s0 * ( v1.position.x - v0.position.x ),
                v0.position.y + s0 * ( v1.position.y - v0.position.y ),
                v0.position.z + s0 * ( v1.position.z - v0.position.z )
            ),
            new Vec3(
                v0.normal.x + s0 * ( v1.normal.x - v0.normal.x ),
                v0.normal.y + s0 * ( v1.normal.y - v0.normal.y ),
                v0.normal.z + s0 * ( v1.normal.z - v0.normal.z )
            )
        )

        return ver;
    }


}
