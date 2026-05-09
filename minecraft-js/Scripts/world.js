import * as THREE from 'three';

import { SimplexNoise } from 'three/examples/jsm/math/SimplexNoise.js';

import { RNG } from './rng';

import { blocks, resources } from './blocks';
import { instance } from 'three/src/nodes/accessors/instancenode';

const geometry = new THREE.BoxGeometry();

export class World extends THREE.Group {

//    @type {
//    {
//        id: number,
//            instanceId: number
//    }[][][]
//}

    data = [];

    params = {
        seed:0,
        terrain: {
            scale: 30,
            magnitude: 0.5,
            offset: 0.2
        }
    };

    constructor(size = { width : 64 , height : 32 }) {
        super();
        this.size = size;
    }

    //Generate world data
    generate() {
        const rng = new RNG(this.params.seed); //Same seed for all

        this.initializeTerrain();
        this.generateResources(rng);
        this.generateTerrain(rng);
        this.generateMeshes();
    }

    //Initializing the world terrain data
    initializeTerrain() {
        this.data = [];
        for (let x = 0; x < this.size.width; x++) {
            const slice = [];
            for (let y = 0; y < this.size.height; y++) {
                const row = [];
                for (let z = 0; z < this.size.width; z++) {
                    row.push({
                        id: blocks.empty.id ,
                        instanceID: null
                    });
                }
                slice.push(row);
            }
            this.data.push(slice);
        }
    }

    generateResources(rng) {

        const simplex = new SimplexNoise(rng);

        resources.forEach(resources => {

            for (let x = 0; x < this.size.width; x++) {
                for (let y = 0; y < this.size.height; y++) {
                    for (let z = 0; z < this.size.width; z++) {
                        const value = simplex.noise3d(
                            x / resources.scale.x,
                            y / resources.scale.y,
                            z / resources.scale.z);
                        if (value > resources.scarity) {
                            this.setBlockID(x, y, z, resources.id);
                        }
                    }
                }
            }
        });
    }

    generateTerrain(rng) {

        const simplex = new SimplexNoise(rng);

        for (let x = 0; x < this.size.width; x++) {
            for (let z = 0; z < this.size.width; z++) {
                const value = simplex.noise(
                    x / this.params.terrain.scale,
                    z / this.params.terrain.scale
                );
                const scaledNoise = this.params.terrain.offset + this.params.terrain.magnitude * value;

                let height = Math.floor(this.size.height * scaledNoise);
                height = Math.max(0, Math.min(height, this.size.height-1));

                for (let y = 0; y <= this.size.height; y++) {
                    if (y < height && this.getBlock(x,y,z).id===blocks.empty.id) {
                        this.setBlockID(x, y, z, blocks.dirt.id);
                    }
                    else if (y == height) {
                        this.setBlockID(x, y, z, blocks.grass.id);
                    }
                    else if(y>height){
                        this.setBlockID(x, y, z, blocks.empty.id);
                    }
                }
            }
        }
    }


    generateMeshes() { 
        this.clear();
        const maxCount = this.size.width * this.size.width * this.size.height;
        const meshes = {};

        Object.values(blocks)
            .filter(blockType => blockType.id != blocks.empty.id)
            .forEach(blockType => {
                const mesh = new THREE.InstancedMesh(geometry, blockType.material,
                    maxCount);
                mesh.name = blockType.name;
                mesh.count = 0;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
                meshes[blockType.id] = mesh;
            });


        const matrix = new THREE.Matrix4();
        for (let x = 0; x < this.size.width; x++) {
            for (let y = 0; y < this.size.height; y++) {
                for (let z = 0; z < this.size.width; z++) {
                    const blockID = this.getBlock(x, y, z).id;

                    if (blockID === blocks.empty.id) continue;

                    const mesh = meshes[blockID];
                    const instanceID = mesh.count;

                    if(blockID != blocks.empty.id &&  !this.isBlockObscured(x,y,z)){
                        matrix.setPosition(x + 0.5, y + 0.5, z + 0.5);
                        mesh.setMatrixAt(instanceID, matrix);
                        this.setBlockInstanceID(x, y, z, instanceID);
                        mesh.count++;
                    }
                }
            }
        }

        this.add(...Object.values(meshes));
    }

    getBlock(x, y, z) {
        if (this.inBounds(x, y, z)) {
            return this.data[x][y][z];
        } else {
            return null;
        }
    }

    inBounds(x, y, z) {
        if (x >= 0 && x < this.size.width &&
            y >= 0 && y < this.size.height &&
            z >= 0 && z < this.size.width) {
            return true;
        }
        else {
            return false;
        }
    }

    setBlockID(x, y, z, id) {
        if (this.inBounds(x, y, z)) {
            this.data[x][y][z].id = id;
        }
    }

    setBlockInstanceID(x, y, z, instanceID) {
        if (this.inBounds(x, y, z)) {
            this.data[x][y][z].instanceID = instanceID;
        }
    }


    isBlockObscured(x, y, z) {
        const up = this.getBlock(x, y + 1, z)?.id ?? blocks.empty.id;
        const down = this.getBlock(x, y - 1, z)?.id ?? blocks.empty.id;
        const right = this.getBlock(x + 1, y, z)?.id ?? blocks.empty.id;
        const left = this.getBlock(x - 1, y, z)?.id ?? blocks.empty.id;
        const forward = this.getBlock(x, y, z + 1)?.id ?? blocks.empty.id;
        const back = this.getBlock(x, y, z - 1)?.id ?? blocks.empty.id;

        if (up === blocks.empty.id ||
            down === blocks.empty.id ||
            right === blocks.empty.id ||
            left === blocks.empty.id ||
            forward === blocks.empty.id ||
            back === blocks.empty.id
        ) {
            return false;
        }
        else return true;
    }
}