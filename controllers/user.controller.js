import { User } from "../models/user.models.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export const register = async (req, res) => {
    try {
        const { fullname, email, phoneNumber, password, role } = req.body;
        if (!fullname || !email || !phoneNumber || !password || !role) {
            return res.status(400).json({ message: "Something is missing", success: false });
        }
        const user = await User.findOne({ email });
        if (user) {
            return res.status(400).json({ message: "User already exists with this email.", success: false });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        await User.create({ fullname, email, phoneNumber, password: hashedPassword, role });
        return res.status(201).json({ message: "Account created successfully.", success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

export const login = async (req, res) => {
    try {
        const { email, password, role } = req.body;

        // Validate input fields
        if (!email || !password || !role) {
            return res.status(400).json({ message: "Something is missing", success: false });
        }

        // Find user by email
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Incorrect email or password.", success: false });
        }

        // Verify password
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) {
            return res.status(400).json({ message: "Incorrect email or password.", success: false });
        }

        // Check role
        if (role.toLowerCase() !== user.role.toLowerCase()) {
            return res.status(400).json({ message: "Account does not exist with the current role.", success: false });
        }

        // Ensure SECRET_KEY is available
        if (!process.env.SECRET_KEY) {
            return res.status(500).json({
                message: "Server configuration error. SECRET_KEY is missing.",
                success: false
            });
        }

        // Generate the token
        const tokenData = { userId: user._id };
        const token = jwt.sign(tokenData, process.env.SECRET_KEY, { expiresIn: '1d' });

        // Construct the user object for the response
        const userResponse = {
            _id: user._id,
            fullname: user.fullname,
            email: user.email,
            phoneNumber: user.phoneNumber,
            role: user.role,
            profile: user.profile || {}
        };

        // Set the cookie and return the response
        return res.status(200)
            .cookie("token", token, {
                maxAge: 1 * 24 * 60 * 60 * 1000, // 1 day in milliseconds
                httpOnly: true, // Prevents client-side access to the cookie
                sameSite: 'strict' // Ensures CSRF protection
            })
            .json({
                message: `Welcome back ${user.fullname}`,
                success: true,
                user: userResponse
            });

    } catch (error) {
        console.error("Error in login function:", error.message);
        return res.status(500).json({
            message: "Internal Server Error",
            success: false
        });
    }
};
export const logout = async (req, res) => {
    try {
        return res.status(200).cookie("token", "", { maxAge: 0 }).json({ message: "Logged out successfully.", success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error", success: false });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const { fullname, email, phoneNumber, bio, skills } = req.body;
        let skillsArray;
        if(skills){
        
        const skillsArray = skills.split(",");
        }
        const userId = req.id;
        let user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found.", success: false });
        }
        if(fullname) user.fullname = fullname
        if(email) user.email = email
        if(phoneNumber) user.phoneNumber = phoneNumber
        if(bio) user.profile.bio = bio;
        if(skills) user.profile.skills = skillsArray;

        await user.save();
        return res.status(200).json({ message: "Profile updated successfully.", user, success: true });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error", success: false });
    }
};
