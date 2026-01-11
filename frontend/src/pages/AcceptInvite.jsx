import { useParams, useNavigate } from "react-router-dom";

const AcceptInvite = () => {
  const { token } = useParams();
  const navigate = useNavigate();

  const acceptInvite = async () => {
    await fetch(`http://localhost:8000/api/invite/accept/${token}?user_id=${user.id}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
    });
    navigate("/developerDashboard");
  };

  return (
    <div className="text-white p-10">
      <h1>Accept Invitation</h1>
      <button onClick={acceptInvite}>Accept & Continue</button>
    </div>
  );
};

export default AcceptInvite;
