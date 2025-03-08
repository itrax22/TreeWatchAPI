const { RechovotLauncher } = require('../BL/rechovot/launch');
const { PetahTikvaLauncher } = require('../BL/petahTikva/petahTikvaLauncher');
const { RishonLauncher } = require('../BL/rishon/rishonLauncher');
const { GivatayimLauncher } = require('../BL/givatayim/givatayimLauncher');
const { AshdodLauncher } = require('../BL/ashdod/ashdodLauncher');


exports.runJob = async (req, res) => {
    try {
        const mode = process.env.NODE_ENV || 'production';
        //await new RechovotLauncher().launch(mode);
        //await new PetahTikvaLauncher().launch(mode);
        //await new RishonLauncher().launch(mode);
        //await new GivatayimLauncher().launch(mode);
        await new AshdodLauncher().launch(mode);

        res.status(200).json({
            success: true,
            message: 'Job launched successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to launch job',
            error: error.message
        });
    }
};