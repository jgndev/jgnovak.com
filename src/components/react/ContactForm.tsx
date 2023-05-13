import InfoBlock from "./InfoBlock";
import EmailBlock from "./EmailBlock";

function ContactForm() {

    return (
        <div className="section">
            <div className="contact-form">
                <InfoBlock />
                <EmailBlock />
            </div>
        </div>
    );
}

export default ContactForm;